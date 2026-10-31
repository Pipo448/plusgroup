// src/services/receiptPaper.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Tay papye resi (57 mm / 80 mm)
// ──────────────────────────────────────────────────────────────
// Yon SÈL kote pou konnen ki tay papye aparèy sa a ap itilize.
// Priyorite:
//   1. Chwa AparÈY la (localStorage 'receipt_size') — se li ki mete nan
//      bouton 57/80 anlè ekran an. Yon biznis ka gen yon ti aparèy 57 mm
//      AK yon gwo printer 80 mm, donk tay la se yon pwopriyete APARÈY la.
//   2. Paramèt biznis la (tenant.receiptSize) — sa ki nan Paramèt yo.
//   3. 80 mm (defo).
// 'receipt_size' se menm kle Sabotay te deja itilize, pou pa kraze anyen.
// ══════════════════════════════════════════════════════════════

export const PAPER_KEY = 'receipt_size'
export const PAPER_EVENT = 'plusgroup-paper-change'

const COMPACT_VALUES = new Set(['57', '58', '57mm', '58mm'])

/** Nenpòt valè (57, '57mm', '58', 'x'…) → '57mm' oswa '80mm' */
export const normalizePaper = (v) =>
  COMPACT_VALUES.has(String(v ?? '').toLowerCase().trim()) ? '57mm' : '80mm'

/** Chwa ki sove sou aparèy sa a (oswa null si pa janm chwazi) */
export function getDevicePaper() {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(PAPER_KEY) : null
    return v ? normalizePaper(v) : null
  } catch { return null }
}

/** Sove chwa a sou aparèy sa a epi avèti UI a */
export function setDevicePaper(size) {
  const v = normalizePaper(size)
  try { localStorage.setItem(PAPER_KEY, v) } catch { /* private mode — pa grav */ }
  try { window.dispatchEvent(new CustomEvent(PAPER_EVENT, { detail: v })) } catch { /* SSR/test */ }
  return v
}

/** '57mm' | '80mm' — aparèy → paramèt biznis → 80mm */
export const getPaperSize = (tenant) =>
  getDevicePaper() || normalizePaper(tenant?.receiptSize || '80mm')

export const isCompactPaper = (tenant) => getPaperSize(tenant) === '57mm'

// cols  = karaktè pa liy (font nòmal)
// dots  = lajè enprimab an pwen (203 DPI → 8 pwen/mm)
// logoMaxW / logoMaxH = limit logo a an % lajè papye a (pa twò gwo)
export const PAPER_SPECS = {
  '57mm': { id: '57mm', mm: 57, cols: 32, dots: 384, logoMaxW: 0.5,  logoMaxH: 0.2  },
  '80mm': { id: '80mm', mm: 80, cols: 48, dots: 576, logoMaxW: 0.4,  logoMaxH: 0.17 },
}

export const getPaperSpec = (tenant) => PAPER_SPECS[getPaperSize(tenant)]
