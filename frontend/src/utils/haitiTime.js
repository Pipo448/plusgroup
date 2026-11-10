// src/utils/haitiTime.js
// Tout dat/lè nan aplikasyon an dwe pase isit la — zòn orè Pòtoprens (America/Port-au-Prince).
// Ayiti swiv lè ete (UTC-5 sezon fwa, UTC-4 ete), kidonk pa janm itilize yon "-5" fiks.
export const HAITI_TZ = 'America/Port-au-Prince'

const pad = (n) => String(n).padStart(2, '0')

// Eleman dat/lè yon moman kòm yo parèt nan Pòtoprens
const haitiParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HAITI_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date instanceof Date ? date : new Date(date))
  const o = {}
  parts.forEach(p => { o[p.type] = p.value })
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second }
}

// "YYYY-MM-DD" jodi a nan Pòtoprens
export const haitiToday = (date = new Date()) => {
  const { y, m, d } = haitiParts(date)
  return `${y}-${pad(m)}-${pad(d)}`
}

// Diferans (ms) ant lè Pòtoprens ak UTC pou yon moman presi
const offsetMs = (date) => {
  const { y, m, d, h, mi, s } = haitiParts(date)
  return Date.UTC(y, m - 1, d, h, mi, s) - Math.floor(date.getTime() / 1000) * 1000
}

// Minwit Pòtoprens pou "YYYY-MM-DD" → ISO UTC egzat (jere UTC-5 ak UTC-4)
export const haitiMidnightISO = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0)
  const off1 = offsetMs(new Date(guess))
  let t = guess - off1
  const off2 = offsetMs(new Date(t))
  if (off2 !== off1) t = guess - off2
  return new Date(t).toISOString()
}

// Afichaj
export const fmtHaitiDate = (d, opts) =>
  new Date(d).toLocaleDateString('fr-HT', { timeZone: HAITI_TZ, ...(opts || {}) })

export const fmtHaitiDateTime = (d, opts) =>
  new Date(d).toLocaleString('fr-HT', {
    timeZone: HAITI_TZ,
    ...(opts || { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  })

// Dat "deplase" pou bibliyotèk tankou date-fns (ki li dat la kòm lè lokal aparèy la)
export const toHaitiDate = (d) => {
  const { y, m, d: dd, h, mi, s } = haitiParts(new Date(d))
  return new Date(y, m - 1, dd, h, mi, s)
}
