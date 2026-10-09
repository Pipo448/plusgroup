// src/services/shareFile.js
// ─────────────────────────────────────────────────────────────
// ✅ Pataje yon fichye (imaj PNG / PDF) — Kanè Epay, Prè, Sabotay
//
// PWOBLÈM ki te genyen:
//  1) Navigatè a mande pou `navigator.share()` rele PANDAN « jès » itilizatè a
//     (anviwon 5 segonn apre klik la). Kreyasyon imaj la (html-to-image) ka pran
//     2-4 segonn sou telefòn → otorizasyon an ekspire → meni pataje a PA parèt
//     (NotAllowedError), e kòd la te tonbe an silans sou « telechaje ».
//     Se poutèt sa ou te wè meni an YON SÈL FWA.
//  2) Nan APK Android la, WebView a pa toujou gen `navigator.share` ak fichye,
//     e « telechaje » pa fè anyen.
//
// SOLISYON:
//  • Imaj la PREPARE davans (lè fenèt resi a louvri) → klik la pataje imedyatman.
//  • Si otorizasyon an ekspire kanmenm, fichye a rete prè: 2yèm klik la pataje touswit.
//  • APK: itilize plugin natif Capacitor « Share » + « Filesystem » si yo enstale.
// ─────────────────────────────────────────────────────────────
import { Capacitor, registerPlugin } from '@capacitor/core'

// ⚠️ Plugin Capacitor = Proxy → pa janm RETOUNEN yo nan yon fonksyon async.
let _FS = null
let _SH = null
const nativeShareAvailable = () => {
  try {
    if (!Capacitor.isNativePlatform()) return false
    if (!Capacitor.isPluginAvailable('Share') || !Capacitor.isPluginAvailable('Filesystem')) return false
    if (!_FS) _FS = registerPlugin('Filesystem')
    if (!_SH) _SH = registerPlugin('Share')
    return true
  } catch { return false }
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onerror = reject
  r.onload = () => resolve(String(r.result).split(',')[1] || '')
  r.readAsDataURL(blob)
})

/**
 * @param {{ blob: Blob, fileName: string, mime: string, title?: string, text?: string }} f
 * @returns {'shared'|'cancel'|'downloaded'|'needs-gesture'}
 */
export async function shareFile(f) {
  // 1) APK — plugin natif
  if (nativeShareAvailable()) {
    try {
      const data = await blobToBase64(f.blob)
      const res  = await _FS.writeFile({ path: f.fileName, data, directory: 'CACHE' })
      await _SH.share({ title: f.title || f.fileName, text: f.text || '', files: [res.uri], dialogTitle: f.title || 'Pataje' })
      return 'shared'
    } catch (e) {
      const msg = String(e?.message || e || '').toLowerCase()
      if (msg.includes('cancel')) return 'cancel'
      console.warn('[SHARE NATIVE]', msg)
      // kontinye ak metòd web la
    }
  }

  // 2) Navigatè / WebView ki sipòte Web Share ak fichye
  try {
    const file = new File([f.blob], f.fileName, { type: f.mime })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: f.title || f.fileName, text: f.text || '' })
        return 'shared'
      } catch (e) {
        if (e?.name === 'AbortError') return 'cancel'
        if (e?.name === 'NotAllowedError') return 'needs-gesture'
      }
    }
  } catch { /* File pa sipòte */ }

  // 3) Telechaje (PC)
  const url = URL.createObjectURL(f.blob)
  const a = document.createElement('a')
  a.href = url; a.download = f.fileName
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'downloaded'
}

// ─── Kach fichye ki deja prepare ───────────────────────────────
const _cache   = new Map()   // key → Promise<{blob,fileName,mime,title,text}>
const MAX_KEYS = 8

const getOrBuild = (key, build) => {
  if (!_cache.has(key)) {
    const p = build().catch(e => { _cache.delete(key); throw e })
    _cache.set(key, p)
    while (_cache.size > MAX_KEYS) _cache.delete(_cache.keys().next().value)
  }
  return _cache.get(key)
}

// Prepare fichye a an aryè-plan (rele l lè fenèt resi a louvri)
export function prepareShare(key, build) {
  getOrBuild(key, build).catch(() => {})
}

// Pataje (ak kach) — retounen menm rezilta ak shareFile
export async function shareCached(key, build) {
  const f = await getOrBuild(key, build)
  return shareFile(f)
}

// Mesaj pou itilizatè a selon rezilta a
export function shareMessage(result, fmtOut) {
  if (result === 'shared')        return { ok: true,  msg: null }
  if (result === 'cancel')        return { ok: false, msg: null }
  if (result === 'downloaded')    return { ok: true,  msg: fmtOut === 'png' ? 'Imaj la telechaje!' : 'PDF la telechaje!' }
  if (result === 'needs-gesture') return { ok: false, msg: 'Fichye a pare — peze bouton an ankò pou pataje.' }
  return { ok: false, msg: null }
}