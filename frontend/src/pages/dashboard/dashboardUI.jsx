// src/pages/dashboard/dashboardUI.jsx — ti zouti pataje pou Tablo de bò a (Plus Fit)
// Grafik ba yo fèt an HTML/CSS (pa gen recharts): pi lejè sou POS Sunmi yo, epi
// yo swiv menm estil ak rès app la.
import { useState, useEffect, useRef } from 'react'

export const TZ = 'America/Port-au-Prince'
export const fmt = (n, d = 2) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: d, maximumFractionDigits: d })
export const fmt0 = (n) => fmt(Math.round(Number(n || 0)), 0)
export const fmtK = (n) => { const x = Math.abs(Number(n || 0)); const s = n < 0 ? '−' : ''; return x >= 1e6 ? `${s}${(x / 1e6).toFixed(x >= 1e7 ? 0 : 1)}M` : x >= 1e3 ? `${s}${(x / 1e3).toFixed(x >= 1e4 ? 0 : 1)}k` : `${s}${Math.round(x)}` }
export const fmtQty = (n) => { const x = Number(n || 0); return Number.isInteger(x) ? fmt(x, 0) : fmt(x, 2).replace(/0$/, '') }
export const tr = (t, k, fb) => { const v = t(k); return v && v !== k ? v : fb }

// Dat yyyy-mm-dd an lè Ayiti
export const todayHT = () => new Date().toLocaleDateString('fr-CA', { timeZone: TZ })
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10) }
export const dayOfWeek = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() }

export function useCountUp(value, ms = 700) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

export function Delta({ cur, prev, suffix }) {
  if (prev == null || (!prev && !cur)) return null
  if (!prev) return <span className="rp-delta up">↑ nouvo</span>
  const p = ((cur - prev) / Math.abs(prev)) * 100
  if (Math.abs(p) < 0.5) return <span className="rp-delta flat">= {suffix}</span>
  return <span className={`rp-delta ${p > 0 ? 'up' : 'down'}`}>{p > 0 ? '↑' : '↓'} {Math.abs(p).toFixed(Math.abs(p) >= 100 ? 0 : 1)}% {suffix}</span>
}

/**
 * Grafik ba (youn oswa plizyè seri)
 * data:   [{ label, tip, values: { key: number } }]
 * series: [{ key, name, color }]
 * active: endèks pou mete an avan (egz. jodi a)
 */
export function Bars({ data, series, height = 200, active, labelEvery = 1, format = fmt }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.flatMap(d => series.map(s => Math.max(0, Number(d.values[s.key] || 0)))))
  const n = data.length
  const gap = n > 20 ? 3 : n > 10 ? 6 : 10
  const cur = hover ?? null
  return (
    <div onMouseLeave={() => setHover(null)}>
      <div className={`db-bars ${cur != null ? 'dim' : ''}`} style={{ '--n': n, '--h': `${height}px`, '--gap': `${gap}px` }}>
        {data.map((d, i) => (
          <div key={i} className={`db-col ${cur === i || (cur == null && active === i) ? 'on' : ''}`}
            onMouseEnter={() => setHover(i)} onClick={() => setHover(h => (h === i ? null : i))}>
            {series.map((s, j) => {
              const v = Math.max(0, Number(d.values[s.key] || 0))
              return <i key={s.key} style={{ height: `${(v / max) * 100}%`, '--c': typeof s.color === 'function' ? s.color(d, i) : s.color, animationDelay: `${i * 35 + j * 60}ms` }}/>
            })}
            {cur === i && (
              <div className="db-tip">
                <b>{d.tip || d.label}</b>
                {series.map(s => (
                  <div key={s.key}><i style={{ background: typeof s.color === 'function' ? s.color(d, i) : s.color }}/>{series.length > 1 && <span style={{ fontFamily: 'Manrope', fontSize: 11, fontWeight: 700, opacity: .7 }}>{s.name}</span>} {format(d.values[s.key])} <small style={{ fontSize: 10, opacity: .6 }}>HTG</small></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="db-xl" style={{ '--n': n, '--gap': `${gap}px` }}>
        {data.map((d, i) => <span key={i} className={active === i ? 'on' : ''}>{i % labelEvery === 0 || i === n - 1 ? d.label : ''}</span>)}
      </div>
    </div>
  )
}