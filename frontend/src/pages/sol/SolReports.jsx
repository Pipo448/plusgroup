// src/pages/sol/SolReports.jsx
// ─── Rapò grafik, KPI lò, banyè ti machann ak resi (franse) ───
// Pa gen okenn lojik biznis nouvo: tout chif yo soti nan done paj la deja kalkile.
import { useState, useMemo, useEffect } from 'react'
import { Wallet, Trophy, CalendarCheck, TrendingUp, Receipt, Printer, X, Store } from 'lucide-react'
import { V, fmt, dmy, MONTHS_SHORT } from './solDashboardUtils'
import { CountUp, BrandIcon } from './SolDashboardComponents'

const IMG_PHOTO = '/images/sol/ti-machann-haiti.jpg'
const IMG_LOGO  = '/images/sol/plus-group-logo.png'

const kindOf = (t) =>
  (t === 'earlyDepo' || t === 'earlyDay' || t === 'early') ? 'early'
  : (t === 'lateWindow' || t === 'late') ? 'late'
  : t === 'veryLate' ? 'miss'
  : 'ok'

// ── Banyè akèy ti machann ───────────────────────────────────
export function SolBanner({ name, tenantName }) {
  const first = String(name || '').trim().split(/\s+/)[0] || ''
  const h = new Date().getHours()
  const hello = h < 12 ? 'Bonjou' : h < 18 ? 'Bonswa' : 'Bonswa'
  return (
    <section className="sol-banner" aria-label="Byenvini">
      <img className="sol-banner-img" src={IMG_PHOTO} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <div className="sol-banner-in">
        <span className="sol-banner-tag"><Store size={12} /> Ti machann · {tenantName || 'Plus Group'}</span>
        <h2>{hello}{first ? `, ${first}` : ''}</h2>
        <p>Chak goud ou mete se yon pa pou biznis ou grandi.</p>
      </div>
      <svg className="sol-banner-wave" viewBox="0 0 2880 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 22 Q180 4 360 22 T720 22 T1080 22 T1440 22 T1800 22 T2160 22 T2520 22 T2880 22 V40 H0Z" fill="rgba(37,99,235,.55)" />
        <path d="M0 28 Q180 14 360 28 T720 28 T1080 28 T1440 28 T1800 28 T2160 28 T2520 28 T2880 28 V40 H0Z" fill="rgba(245,185,58,.55)" />
      </svg>
    </section>
  )
}

// ── KPI lò (style Gym: ikòn + gwo chif) ─────────────────────
export function GoldKpis({ amountContributed, restaPouPeye, payout, totalPaid, totalDates, isStopped, payoutDate }) {
  const items = [
    { Icon: Wallet,        val: amountContributed, lab: 'Lajan ou mete', sub: 'HTG deja peye' },
    { Icon: TrendingUp,    val: restaPouPeye,      lab: 'Rès pou mete',  sub: 'HTG ki rete' },
    { Icon: Trophy,        val: isStopped ? 0 : payout, lab: 'Men ou', sub: payoutDate ? `touche ${dmy(payoutDate)}` : 'HTG ou ap touche' },
    { Icon: CalendarCheck, val: totalPaid,         lab: 'Peman fèt',     sub: `sou ${totalDates} dat`, plain: true },
  ]
  return (
    <div className="sol-kpis">
      {items.map(({ Icon, val, lab, sub, plain }, i) => (
        <div key={lab} className="sol-kpi" style={{ '--i': i }}>
          <div className="sol-kpi-ico"><Icon size={17} /></div>
          <div className="sol-kpi-val sol-num"><CountUp value={val} />{!plain && <small>G</small>}</div>
          <div className="sol-kpi-lab">{lab}</div>
          <div className="sol-kpi-sub">{sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Grafik: kourb kimile + donut + ba chak mwa ──────────────
export function SolReports({ dates, member, plan, today, isDateOverdue, allSlots }) {
  const per = plan.amount * allSlots.length

  const stats = useMemo(() => {
    let cum = 0
    const pts = dates.map((d, i) => {
      const paid = !!member.payments?.[d]
      if (paid) cum += per
      return { d, goal: (i + 1) * per, got: cum, paid }
    })
    const c = { early: 0, ok: 0, late: 0, miss: 0, next: 0 }
    dates.forEach((d) => {
      if (member.payments?.[d]) c[kindOf(member.paymentTimings?.[d])]++
      else if (isDateOverdue(d)) c.miss++
      else c.next++
    })
    const months = {}
    dates.forEach((d) => {
      const k = String(d).slice(0, 7)
      months[k] = months[k] || { k, paid: 0, goal: 0 }
      months[k].goal += per
      if (member.payments?.[d]) months[k].paid += per
    })
    return { pts, c, months: Object.values(months) }
  }, [dates, member, per, isDateOverdue])

  // —— kourb ——
  const W = 320, H = 150, PL = 8, PR = 8, PT = 12, PB = 22
  const maxY = Math.max(1, ...stats.pts.map(p => p.goal))
  const n = stats.pts.length
  const X = (i) => PL + (n <= 1 ? 0 : (i / (n - 1)) * (W - PL - PR))
  const Y = (v) => PT + (1 - v / maxY) * (H - PT - PB)
  const line = (key) => stats.pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p[key]).toFixed(1)}`).join(' ')
  const gotPath = line('got')
  const area = n ? `${gotPath} L${X(n - 1).toFixed(1)} ${H - PB} L${X(0).toFixed(1)} ${H - PB} Z` : ''
  const lastPaidIdx = stats.pts.reduce((a, p, i) => (p.paid ? i : a), -1)

  // —— donut ——
  const segs = [
    { k: 'early', lab: 'Bonè',     col: 'var(--s-accent)' },
    { k: 'ok',    lab: 'Alè',      col: 'var(--s-green)' },
    { k: 'late',  lab: 'Reta',     col: 'var(--s-amber)' },
    { k: 'miss',  lab: 'Pa peye',  col: 'var(--s-red)' },
    { k: 'next',  lab: 'Pwochen',  col: 'var(--s-line2)' },
  ]
  const total = Math.max(1, n)
  const done = stats.c.early + stats.c.ok + stats.c.late
  const [armed, setArmed] = useState(false)
  useEffect(() => { const t = setTimeout(() => setArmed(true), 60); return () => clearTimeout(t) }, [])
  let off = 0

  // —— ba chak mwa ——
  const byDate = stats.months.length < 3
  const mm = byDate
    ? stats.pts.slice(-10).map(p => ({ k: p.d, paid: p.paid ? per : 0, goal: per, lab: String(Number(p.d.slice(8, 10))) }))
    : stats.months.slice(-8).map(m => ({ ...m, lab: MONTHS_SHORT[Number(m.k.slice(5, 7)) - 1] }))
  const maxM = Math.max(1, ...mm.map(m => m.goal))
  const BW = 320, BH = 120

  return (
    <div className="sol-rep">
      <div className="sol-rep-grid two">
        <div className="sol-rep-card">
          <div className="sol-rep-head">
            <span className="sol-rep-title">Biznis ou ap grandi</span>
            <span className="sol-badge accent sol-num">{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="sol-rep-sub">Lajan ou mete (ble/lò) kont sa ou te dwe mete (pwen)</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Kourb lajan ou mete" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="solGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5B93A" stopOpacity=".42" />
                <stop offset="100%" stopColor="#F5B93A" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="solGoldLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFE08A" />
                <stop offset="100%" stopColor="#F5B93A" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map(f => (
              <line key={f} x1={PL} x2={W - PR} y1={Y(maxY * f)} y2={Y(maxY * f)} stroke="var(--s-line)" strokeWidth="1" />
            ))}
            <path d={line('goal')} fill="none" stroke="var(--s-accent)" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" opacity=".8" />
            {n > 0 && <path className="sol-chart-area" d={area} fill="url(#solGold)" />}
            {n > 0 && <path className="sol-chart-line" pathLength="1000" style={{ '--len': 1000 }} d={gotPath} fill="none" stroke="url(#solGoldLine)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />}
            {lastPaidIdx >= 0 && (
              <g className="sol-chart-area">
                <circle cx={X(lastPaidIdx)} cy={Y(stats.pts[lastPaidIdx].got)} r="8" fill="#F5B93A" opacity=".25" />
                <circle cx={X(lastPaidIdx)} cy={Y(stats.pts[lastPaidIdx].got)} r="4" fill="#F5B93A" stroke="#fff" strokeWidth="1.5" />
              </g>
            )}
            {n > 0 && (
              <>
                <text x={PL} y={H - 6} fontSize="9.5" fill="var(--s-muted)">{dmy(stats.pts[0].d).slice(0, 5)}</text>
                <text x={W - PR} y={H - 6} fontSize="9.5" fill="var(--s-muted)" textAnchor="end">{dmy(stats.pts[n - 1].d).slice(0, 5)}</text>
              </>
            )}
          </svg>
          <div className="sol-legend-row">
            <span><em style={{ background: '#F5B93A' }} />Ou mete: <b className="sol-num">{fmt(stats.pts[n - 1]?.got || 0)} G</b></span>
            <span><em style={{ background: 'var(--s-accent)' }} />Objektif: <b className="sol-num">{fmt(stats.pts[n - 1]?.goal || 0)} G</b></span>
          </div>
        </div>

        <div className="sol-rep-card">
          <div className="sol-rep-head"><span className="sol-rep-title">Disiplin peman</span></div>
          <div className="sol-rep-sub">Ki jan ou peye chak dat</div>
          <div className="sol-donut-wrap">
            <div className="sol-donut-c">
              <svg viewBox="0 0 42 42" width="132" height="132" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--s-line)" strokeWidth="5" />
                {segs.map(s => {
                  const v = (stats.c[s.k] / total) * 100
                  const el = (
                    <circle key={s.k} className="sol-seg" cx="21" cy="21" r="15.915" fill="none" stroke={s.col} strokeWidth="5"
                      pathLength="100" strokeDasharray={armed ? `${Math.max(0, v - (v > 0 ? 0.6 : 0))} ${100 - v + (v > 0 ? 0.6 : 0)}` : '0 100'}
                      strokeDashoffset={-off} />
                  )
                  off += v
                  return el
                })}
              </svg>
              <div className="sol-donut-txt"><b className="sol-num"><CountUp value={done} /></b><span>sou {n} dat</span></div>
            </div>
            <div className="sol-legend-row" style={{ flexDirection: 'column', gap: 6, marginTop: 0 }}>
              {segs.filter(s => stats.c[s.k] > 0).map(s => (
                <span key={s.k}><em style={{ background: s.col }} />{s.lab}: <b className="sol-num">{stats.c[s.k]}</b></span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mm.length > 0 && (
        <div className="sol-rep-card">
          <div className="sol-rep-head"><span className="sol-rep-title">{byDate ? 'Lajan ou mete chak dat' : 'Lajan ou mete chak mwa'}</span></div>
          <div className="sol-rep-sub">Ba lò = ou mete · ba pal = sa ki te prevwa</div>
          <svg viewBox={`0 0 ${BW} ${BH + 20}`} width="100%" role="img" aria-label="Lajan ou mete" style={{ display: 'block' }}>
            {mm.map((m, i) => {
              const slot = BW / mm.length
              const bw = Math.min(30, slot * 0.58)
              const x = i * slot + (slot - bw) / 2
              const hg = (m.goal / maxM) * BH
              const hp = (m.paid / maxM) * BH
              return (
                <g key={m.k}>
                  <rect x={x} y={BH - hg} width={bw} height={hg} rx="5" fill="var(--s-accent-soft)" stroke="var(--s-accent-line)" strokeWidth="1" />
                  {hp > 0 && <rect className="sol-bar" style={{ '--i': i }} x={x} y={BH - hp} width={bw} height={hp} rx="5" fill="url(#solGoldLine)" />}
                  <text x={x + bw / 2} y={BH + 14} fontSize="9.5" textAnchor="middle" fill="var(--s-muted)">{m.lab}</text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

// ── Resi franse (57 mm / enprimab) ──────────────────────────
export function SolReceiptButton({ onClick }) {
  return (
    <button className="sol-receipt-btn" onClick={onClick}>
      <div className="sol-kpi-ico" style={{ margin: 0, flexShrink: 0 }}><Receipt size={18} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Resi peman mwen</div>
        <div style={{ fontSize: 12, color: V.muted, marginTop: 2 }}>Gade epi enprime rezime kont ou</div>
      </div>
      <Printer size={17} style={{ color: V.gold, flexShrink: 0 }} />
    </button>
  )
}

const FREQ_FR = { daily: 'Quotidien', weekly: 'Hebdomadaire', biweekly: 'Aux 2 semaines', monthly: 'Mensuel' }

export function SolReceiptModal({ onClose, member, plan, tenantName, totalPaid, totalDates, amountContributed, restaPouPeye, payout, lastPaidDate }) {
  const now = new Date()
  const row = (a, b) => <div className="r"><span>{a}</span><b>{b}</b></div>
  const money = (n) => `${fmt(n)} HTG`
  return (
    <div className="sol-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sol-modal-sheet" role="dialog" aria-modal="true" aria-label="Reçu">
        <div className="sol-grab" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="sol-modal-title" style={{ marginBottom: 0 }}>Reçu</div>
          <button className="sol-icon-btn" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="sol-paper">
          <h4>{tenantName || 'PLUS GROUP'}</h4>
          <div className="c">REÇU DE PAIEMENTS</div>
          <div className="c">{now.toLocaleDateString('fr-FR')} {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          <hr />
          {row('Membre', member.name)}
          {member.phone ? row('Tél.', member.phone) : null}
          {row('Plan', plan.name)}
          {row('Fréquence', FREQ_FR[plan.frequency] || plan.frequency)}
          {row('Cotisation', money(plan.amount))}
          <hr />
          {row('Paiements', `${totalPaid}/${totalDates}`)}
          {lastPaidDate ? row('Dernier', dmy(lastPaidDate)) : null}
          {row('Total versé', money(amountContributed))}
          {row('Reste à payer', money(restaPouPeye))}
          <hr />
          <div className="r tot"><span>GAIN PRÉVU</span><b>{money(payout)}</b></div>
          <hr />
          <div className="c">Merci de votre confiance</div>
          <div className="c" style={{ marginTop: 6, fontWeight: 700 }}>Produit par PLUS GROUP</div>
          <div className="c">Tel: +509 4244 9024</div>
        </div>
        <button className="sol-btn primary" style={{ width: '100%', marginTop: 20 }} onClick={() => window.print()}>
          <Printer size={16} /> Imprimer
        </button>
      </div>
    </div>
  )
}

export { IMG_LOGO, BrandIcon }
