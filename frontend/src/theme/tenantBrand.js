// src/theme/tenantBrand.js
// ─── Koulè anblèm chak tenant ─────────────────────────────────────────
// Yon sèl koulè (+ yon dezyèm opsyonèl) → tout palèt app la: meni bò kote a,
// tèt paj la, bouton yo, modil Restoran an ak pòtal kliyan an.
// Kalkil yo garanti tèks yo toujou lizib (kontras WCAG), menm si tenant lan
// chwazi yon koulè twò klè (jòn) oswa twò fonse (ble maren).
import { useEffect, useLayoutEffect } from 'react'
import api from '../services/api'

export const DEFAULT_BRAND = { primary: '#f5680c', secondary: '#ff8534', sidebar: 'dark', applyPortal: true }

// ── Zouti koulè ─────────────────────────────────────────────────────────
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n))
export function normHex(h) {
  let s = String(h || '').trim().replace(/^#?/, '#').toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(s)) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
  return /^#[0-9a-f]{6}$/.test(s) ? s : null
}
export const hexToRgb = (h) => { const n = parseInt(normHex(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
export const rgbToHex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
export const hexToHsl = (h) => rgbToHsl(...hexToRgb(h))
const lum = (h) => {
  const [r, g, b] = hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
export function mix(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}
export const shade = (h, dl) => { const [hh, s, l] = hexToHsl(h); return hslToHex(hh, s, l + dl) }
// Tèks ki pi lizib sou yon koulè
export const readableOn = (bg) => (contrast(bg, '#ffffff') >= contrast(bg, '#15110d') ? '#ffffff' : '#15110d')
// Klere oswa fonse yon koulè jiskaske l gen ase kontras ak fon an
export function ensureContrast(color, bg, min = 4.5) {
  if (contrast(color, bg) >= min) return color
  const lighter = lum(bg) < 0.4
  let [h, s, l] = hexToHsl(color), out = color
  for (let i = 0; i < 60 && contrast(out, bg) < min; i++) {
    l = clamp(l + (lighter ? 0.015 : -0.015)); out = hslToHex(h, s, l)
  }
  return out
}
const rgbStr = (h) => hexToRgb(h).join(', ')

// ── Dezyèm koulè ki marye ak premye a ───────────────────────────────────
export function matchingColors(primary) {
  const p = normHex(primary) || DEFAULT_BRAND.primary
  const [h, s, l] = hexToHsl(p)
  const sat = Math.max(s, 0.45)
  return [
    { id: 'soft', color: hslToHex(h + 18, sat, clamp(l + 0.12, 0.42, 0.66)) },
    { id: 'analog', color: hslToHex(h + 35, sat, clamp(l, 0.4, 0.6)) },
    { id: 'contrast', color: hslToHex(h + 180, clamp(sat * 0.85), clamp(l, 0.4, 0.58)) },
    { id: 'split', color: hslToHex(h + 150, clamp(sat * 0.8), 0.5) },
    { id: 'deep', color: hslToHex(h, sat, clamp(l - 0.2, 0.18, 0.35)) },
    { id: 'gold', color: '#c9a84c' },
  ].filter((c, i, a) => a.findIndex((x) => x.color === c.color) === i && c.color !== p)
}
export const autoSecondary = (primary) => matchingColors(primary)[0].color

// ── Palèt konplè → varyab CSS ───────────────────────────────────────────
const SIDE_DARK = ['#0f1117', '#16192a', '#1a1f35']
const SIDE_NIGHT = ['#0b0b0d', '#131316', '#1a1a1f']
const RESTO_DARK_BG = '#110d0a'
const RESTO_LIGHT_BG = '#f6efe5'

export function buildPalette(input) {
  const primary = normHex(input?.primary) || DEFAULT_BRAND.primary
  const secondary = normHex(input?.secondary) || autoSecondary(primary)
  const sidebar = ['dark', 'brand', 'night'].includes(input?.sidebar) ? input.sidebar : 'dark'
  const [h, s] = hexToHsl(primary)
  const side = sidebar === 'brand'
    ? [hslToHex(h, Math.min(s, 0.55), 0.075), hslToHex(h, Math.min(s, 0.5), 0.11), hslToHex(h, Math.min(s, 0.45), 0.15)]
    : sidebar === 'night' ? SIDE_NIGHT : SIDE_DARK
  const onDark = ensureContrast(primary, side[1], 4.5)
  const ink = ensureContrast(primary, '#ffffff', 4.5)
  const restoD = ensureContrast(primary, RESTO_DARK_BG, 5)
  const restoL = ensureContrast(primary, RESTO_LIGHT_BG, 4)
  const vars = {
    '--brand': primary, '--brand-rgb': rgbStr(primary),
    '--brand-2': secondary, '--brand-2-rgb': rgbStr(secondary),
    '--brand-dark': shade(primary, -0.16),
    '--brand-on-dark': onDark, '--brand-on-dark-rgb': rgbStr(onDark),
    '--brand-ink': ink,
    '--on-brand': readableOn(primary),
    '--side-top': side[0], '--side-bg': side[1], '--side-bot': side[2],
    '--app-bg': mix('#f5f2ee', primary, 0.045),
    // Modil Restoran + pòtal (tèm fonse / klè)
    '--brand-d': restoD, '--brand-d-rgb': rgbStr(restoD), '--brand-d-ink': mix(restoD, '#ffffff', 0.22), '--on-brand-d': readableOn(restoD),
    '--brand-l': restoL, '--brand-l-rgb': rgbStr(restoL), '--brand-l-ink': ensureContrast(primary, RESTO_LIGHT_BG, 5.5), '--on-brand-l': readableOn(restoL),
    '--brand-2-d': ensureContrast(secondary, RESTO_DARK_BG, 4.5), '--brand-2-l': ensureContrast(secondary, RESTO_LIGHT_BG, 3.5),
  }
  const notes = []
  if (contrast(primary, '#ffffff') < 2.2) notes.push('light')
  if (contrast(primary, side[1]) < 2.2) notes.push('dark')
  if (s < 0.12) notes.push('gray')
  return { primary, secondary, sidebar, vars, notes, themeColor: side[0] }
}

// ── Aplike / retire sou paj la ──────────────────────────────────────────
const ALL_KEYS = Object.keys(buildPalette(DEFAULT_BRAND).vars)
export function applyBrand(input, { themeColor = true } = {}) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (!input) {
    ALL_KEYS.forEach((k) => root.style.removeProperty(k))
    root.removeAttribute('data-brand')
    return
  }
  const pal = buildPalette(input)
  Object.entries(pal.vars).forEach(([k, v]) => root.style.setProperty(k, v))
  root.setAttribute('data-brand', pal.sidebar)
  if (themeColor) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pal.themeColor)
}

const cacheKey = (tenantId) => `pg-brand:${tenantId || 'x'}`
const readCache = (tenantId) => { try { return JSON.parse(localStorage.getItem(cacheKey(tenantId))) } catch { return null } }
const writeCache = (tenantId, b) => { try { b ? localStorage.setItem(cacheKey(tenantId), JSON.stringify(b)) : localStorage.removeItem(cacheKey(tenantId)) } catch { /* */ } }

// ── API ─────────────────────────────────────────────────────────────────
export const brandingApi = {
  get: () => api.get('/branding').then((r) => r.data?.branding || null),
  save: (b) => api.put('/branding', b).then((r) => r.data?.branding || null),
  reset: () => api.delete('/branding').then(() => null),
}

// Rele apre yon anrejistreman pou tout app la chanje koulè touswit
export function publishBrand(tenantId, b) {
  writeCache(tenantId, b)
  applyBrand(b)
  try { window.dispatchEvent(new CustomEvent('pg-brand', { detail: b })) } catch { /* */ }
}

// ── Hook: nan AppLayout (tout paj konekte yo) ───────────────────────────
export function useTenantBrand(tenantId) {
  // 1) Koulè ki nan kach la parèt anvan premye penti a (pa gen « flash » zoranj)
  useLayoutEffect(() => {
    if (!tenantId) return undefined
    const cached = readCache(tenantId)
    applyBrand(cached)
    return () => applyBrand(null) // dekonekte → retounen sou koulè PLUS GROUP
  }, [tenantId])

  // 2) Vrè valè a soti nan sèvè a
  useEffect(() => {
    if (!tenantId) return undefined
    let alive = true
    brandingApi.get()
      .then((b) => { if (!alive) return; writeCache(tenantId, b); applyBrand(b) })
      .catch(() => { /* rete ak kach la */ })
    const onChange = (e) => applyBrand(e.detail || null)
    window.addEventListener('pg-brand', onChange)
    return () => { alive = false; window.removeEventListener('pg-brand', onChange) }
  }, [tenantId])
}

// ── Koulè ki nan logo a ─────────────────────────────────────────────────
async function loadForCanvas(src) {
  let url = src, revoke = null
  if (!src.startsWith('data:')) {
    try {
      const res = await fetch(src, { mode: 'cors', credentials: 'omit' })
      if (res.ok) { url = URL.createObjectURL(await res.blob()); revoke = url }
    } catch { /* eseye dirèkteman */ }
  }
  const img = await new Promise((ok, ko) => {
    const i = new Image(); i.crossOrigin = 'anonymous'
    i.onload = () => ok(i); i.onerror = ko; i.src = url
  })
  return { img, revoke }
}

export async function extractLogoColors(src, max = 6) {
  if (!src) return []
  const { img, revoke } = await loadForCanvas(src)
  try {
    const N = 72
    const k = Math.min(1, N / Math.max(img.naturalWidth || N, img.naturalHeight || N))
    const w = Math.max(1, Math.round((img.naturalWidth || N) * k)), h = Math.max(1, Math.round((img.naturalHeight || N) * k))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    const px = ctx.getImageData(0, 0, w, h).data
    const buckets = new Map(), neutrals = new Map()
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 200) continue
      const [hh, ss, ll] = rgbToHsl(px[i], px[i + 1], px[i + 2])
      if (ll > 0.93 || ll < 0.06) continue // fon blan / nwa
      const target = ss < 0.16 ? neutrals : buckets
      const key = ss < 0.16 ? `n${Math.round(ll * 4)}` : `${Math.round(hh / 14)}-${Math.round(ll * 3)}`
      const b = target.get(key) || { r: 0, g: 0, b: 0, n: 0, s: 0 }
      b.r += px[i]; b.g += px[i + 1]; b.b += px[i + 2]; b.n += 1; b.s += ss
      target.set(key, b)
    }
    const toList = (m, satBoost) => [...m.values()]
      .map((b) => ({ color: rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n), score: b.n * (satBoost ? 0.4 + b.s / b.n : 0.6) }))
      .sort((a, b) => b.score - a.score)
    const ranked = [...toList(buckets, true), ...toList(neutrals, false)]
    const out = []
    for (const c of ranked) {
      const [h1, s1, l1] = hexToHsl(c.color)
      const near = out.some((o) => {
        const [h2, s2, l2] = hexToHsl(o)
        const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2))
        return (s1 < 0.16 || s2 < 0.16) ? Math.abs(l1 - l2) < 0.18 && Math.abs(s1 - s2) < 0.2 : dh < 22 && Math.abs(l1 - l2) < 0.22
      })
      if (!near) out.push(c.color)
      if (out.length >= max) break
    }
    return out
  } finally { if (revoke) URL.revokeObjectURL(revoke) }
}