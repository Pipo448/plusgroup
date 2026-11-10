// src/components/BarcodeCameraModal.jsx
// ✅ Skanè kòd ba ak KAMERA (telefòn / APK / òdinatè ak webcam).
//  • Chrome Android ak Chrome/Edge sou Mac → API natif `BarcodeDetector` (rapid)
//  • Lòt (Windows, Firefox, WebView ki pa sipòte l) → ZXing chaje otomatikman (CDN, yon sèl fwa)
//  • Si kamera a pa disponib / pèmisyon refize → chan pou tape kòd la manyèlman
import { useEffect, useRef, useState } from 'react'
import { Camera, X, ScanLine, Check } from 'lucide-react'
import { scanFeedback } from '../hooks/useBarcodeScanner'

const ZXING_SRC = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar', 'qr_code']

function loadZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing)
  if (window.__zxingPromise) return window.__zxingPromise
  window.__zxingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = ZXING_SRC
    s.onload = () => (window.ZXing ? resolve(window.ZXing) : reject(new Error('ZXing pa chaje')))
    s.onerror = () => { window.__zxingPromise = null; reject(new Error('Pa ka chaje skanè a (entènèt?)')) }
    document.head.appendChild(s)
  })
  return window.__zxingPromise
}

export function BarcodeCameraModal({ onDetected, onClose, continuous = false, title = 'Skane kòd ba' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const stopRef = useRef(false)
  const lastRef = useRef({ code: '', at: 0 })
  const cbRef = useRef(onDetected)
  cbRef.current = onDetected
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [manual, setManual] = useState('')
  const [flash, setFlash] = useState('')

  const handleCode = (raw) => {
    const code = String(raw || '').trim()
    if (!code) return
    const now = Date.now()
    if (code === lastRef.current.code && now - lastRef.current.at < 2000) return   // anpeche doub
    lastRef.current = { code, at: now }
    scanFeedback(true)
    setFlash(code)
    cbRef.current?.(code)
    if (!continuous) { stopRef.current = true; onClose?.() }
  }

  useEffect(() => {
    stopRef.current = false
    let stream = null
    let timer = null

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera pa sipòte sou aparèy sa a.')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (stopRef.current) { stream.getTracks().forEach(t => t.stop()); return }
        const v = videoRef.current
        v.srcObject = stream
        v.setAttribute('playsinline', 'true')
        await v.play()
        setReady(true)

        // ── Chwazi detektè a
        let nativeDetector = null
        if ('BarcodeDetector' in window) {
          try {
            const supported = await window.BarcodeDetector.getSupportedFormats()
            const formats = NATIVE_FORMATS.filter(f => supported.includes(f))
            if (formats.length) nativeDetector = new window.BarcodeDetector({ formats })
          } catch { nativeDetector = null }
        }

        let zx = null, zxReader = null
        if (!nativeDetector) {
          zx = await loadZXing()
          const hints = new Map()
          hints.set(zx.DecodeHintType.POSSIBLE_FORMATS, [
            zx.BarcodeFormat.EAN_13, zx.BarcodeFormat.EAN_8, zx.BarcodeFormat.UPC_A, zx.BarcodeFormat.UPC_E,
            zx.BarcodeFormat.CODE_128, zx.BarcodeFormat.CODE_39, zx.BarcodeFormat.ITF, zx.BarcodeFormat.QR_CODE,
          ])
          hints.set(zx.DecodeHintType.TRY_HARDER, true)
          zxReader = new zx.MultiFormatReader()
          zxReader.setHints(hints)
        }

        const tick = async () => {
          if (stopRef.current) return
          try {
            if (v.readyState >= 2 && v.videoWidth) {
              if (nativeDetector) {
                const res = await nativeDetector.detect(v)
                if (res?.length) handleCode(res[0].rawValue)
              } else {
                const c = canvasRef.current
                const scale = Math.min(1, 900 / v.videoWidth)
                c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale)
                c.getContext('2d', { willReadFrequently: true }).drawImage(v, 0, 0, c.width, c.height)
                try {
                  const bmp = new zx.BinaryBitmap(new zx.HybridBinarizer(new zx.HTMLCanvasElementLuminanceSource(c)))
                  handleCode(zxReader.decode(bmp).getText())
                } catch { /* pa gen kòd nan imaj sa a — nòmal */ }
              }
            }
          } catch { /* kontinye */ }
          if (!stopRef.current) timer = setTimeout(tick, nativeDetector ? 120 : 200)
        }
        tick()
      } catch (e) {
        const name = e?.name || ''
        setError(
          name === 'NotAllowedError' ? 'Pèmisyon kamera refize. Otorize kamera a nan paramèt aparèy la, oswa tape kòd la anba.'
          : name === 'NotFoundError' ? 'Okenn kamera pa jwenn. Tape kòd la anba.'
          : (e?.message || 'Kamera pa disponib. Tape kòd la anba.')
        )
      }
    }
    start()

    const esc = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', esc)
    return () => {
      stopRef.current = true
      clearTimeout(timer)
      window.removeEventListener('keydown', esc)
      try { stream?.getTracks().forEach(t => t.stop()) } catch { /* pa grav */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitManual = () => { if (manual.trim()) { handleCode(manual); setManual('') } }

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(8,12,40,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,.4)', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'linear-gradient(115deg,#0F1A5C,#1B2A8F)', color: '#fff' }}>
          <ScanLine size={19} />
          <b style={{ flex: 1, fontSize: 15 }}>{title}</b>
          <button type="button" onClick={onClose} aria-label="Fèmen"
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', display: error ? 'none' : 'block' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {/* Kad vize */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '72%', height: '38%', borderRadius: 14, border: '2.5px solid #FFC83D', boxShadow: '0 0 0 999px rgba(0,0,0,.35)' }} />
          </div>
          {!ready && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>Ap louvri kamera a…</div>}
          {flash && continuous && (
            <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, background: 'rgba(5,150,105,.95)', color: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={15} /> {flash}
            </div>
          )}
        </div>

        {error && <p style={{ margin: 0, padding: '16px 16px 4px', fontSize: 13, color: '#B91C1C', fontWeight: 700, lineHeight: 1.5 }}>{error}</p>}

        <div style={{ padding: 16, display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#6B7AAB', fontWeight: 600 }}>
            {continuous ? 'Kenbe kòd la devan kamera a — chak kòd ajoute otomatikman.' : 'Mete kòd ba a nan kad la.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitManual()}
              placeholder="…oswa tape kòd la" inputMode="text" autoComplete="off"
              style={{ flex: 1, minWidth: 0, height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid rgba(27,42,143,.2)', fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
            <button type="button" onClick={submitManual}
              style={{ height: 44, padding: '0 16px', borderRadius: 12, border: 'none', background: '#1B2A8F', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Bouton ki louvri kamera a — mete l kote nenpòt chan rechèch
export function CameraScanButton({ onDetected, continuous = false, className = '', style, label = 'Kamera', title = 'Skane ak kamera a', iconOnly = false }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} style={style} title={title} aria-label={title} onClick={() => setOpen(true)}>
        <Camera size={15} /> {!iconOnly && label}
      </button>
      {open && <BarcodeCameraModal continuous={continuous} onDetected={onDetected} onClose={() => setOpen(false)} />}
    </>
  )
}

export default BarcodeCameraModal
