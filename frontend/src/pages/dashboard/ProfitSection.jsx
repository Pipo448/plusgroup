// src/pages/dashboard/ProfitSection.jsx — Plus Fit redesign (Rapò benefis, admin)
// ✅ KORIJE:
//   • Peryòd yo (jodi a, semèn, mwa…) te kalkile ak lè telefòn nan → kounye a lè Ayiti
//   • Si rapò a pa t chaje (erè), seksyon an te disparèt san di anyen → kounye a mesaj + « Eseye ankò »
//   • Kantite vann te awondi (2,5 kg → « 3 ») → kounye a desimal yo rete
//   • Maj % te ka tèks oswa vid → kounye a toujou yon nonb
//   • Tablo a te bezwen glise sou kote sou telefòn → kounye a se kat
// ✅ NOUVO:
//   • Grafik chak jou Vant / Kou / Benefis ak detay lè w touche yon jou
//   • Triye tablo a (benefis, maj, vant, kantite), rechèch pwodui
//   • Alèt « pwodui k ap fè pèt » (benefis negatif)
//   • Paj la sonje dènye peryòd ou te chwazi a
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Award, ChevronDown, ChevronUp, Search, AlertTriangle, RefreshCw, Wallet, ArrowDownUp } from 'lucide-react'
import { reportAPI } from '../../services/api'
import { fmt, fmt0, fmtK, fmtQty, tr, todayHT, addDays, dayOfWeek, useCountUp, Bars } from './dashboardUI'

const KEY = 'pg-profit-period'
const num = (x) => { const n = Number(String(x ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }

const getPeriodDates = (period) => {
  const t = todayHT()
  switch (period) {
    case 'today':  return { dateFrom: t, dateTo: t }
    case 'week':   { const back = (dayOfWeek(t) + 6) % 7; return { dateFrom: addDays(t, -back), dateTo: t } }
    case '7days':  return { dateFrom: addDays(t, -6), dateTo: t }
    case 'month':  return { dateFrom: t.slice(0, 8) + '01', dateTo: t }
    case '30days':
    default:       return { dateFrom: addDays(t, -29), dateTo: t }
  }
}

function Card({ label, value, sub, icon: Icon, color, pct, delay }) {
  const v = useCountUp(value)
  return (
    <div className="rp-kpi" style={{ '--kc': color, animationDelay: `${delay}ms` }}>
      <div className="l"><i><Icon size={14}/></i> {label}</div>
      <div className="v" style={{ color }}>{pct ? `${v.toFixed(1)}%` : <>{v < 0 ? '−' : ''}{fmt0(Math.abs(v))}<small>HTG</small></>}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  )
}

export default function ProfitSection() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState(() => { try { return localStorage.getItem(KEY) || 'month' } catch { return 'month' } })
  const [showAll, setShowAll] = useState(false)
  const [big, setBig] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ k: 'benefisHtg', dir: -1 })
  useEffect(() => { try { localStorage.setItem(KEY, period) } catch {} }, [period])

  const PERIODS = [
    { v: 'today',  l: tr(t, 'dashboard.profitPeriodToday', 'Jodi a') },
    { v: 'week',   l: tr(t, 'dashboard.profitPeriodWeek', 'Semèn sa a') },
    { v: '7days',  l: tr(t, 'dashboard.profitPeriod7days', '7 jou') },
    { v: 'month',  l: tr(t, 'dashboard.profitPeriodMonth', 'Mwa sa a') },
    { v: '30days', l: tr(t, 'dashboard.profitPeriod30days', '30 jou') },
  ]
  const { dateFrom, dateTo } = getPeriodDates(period)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['profit-report', dateFrom, dateTo],
    queryFn: () => reportAPI.getProfit({ dateFrom, dateTo }).then(r => r.data.profit),
    staleTime: 60_000,
  })

  const tx = data?.totaux || {}
  const tot = {
    vant: num(tx.vantHtg), kout: num(tx.koutHtg), brit: num(tx.benefisHtg), maj: num(tx.majPct),
    depans: num(tx.depansHtg), net: num(tx.benefisNetHtg), majNet: num(tx.majNetPct),
  }
  const byProduct = useMemo(() => (data?.byProduct || []).map(p => ({ ...p, vantHtg: num(p.vantHtg), koutHtg: num(p.koutHtg), benefisHtg: num(p.benefisHtg), majPct: num(p.majPct), qteVann: num(p.qteVann) })), [data])
  const losers = byProduct.filter(p => p.benefisHtg < 0)

  const daily = useMemo(() => (data?.daily || []).map(d => {
    const [, m, dd] = String(d.date).slice(0, 10).split('-')
    return { label: `${dd}/${m}`, tip: `${dd}/${m}`, values: { vant: num(d.vant), kout: num(d.kout), ben: Math.max(0, num(d.benefis)) } }
  }), [data])

  const list = useMemo(() => {
    const k = q.trim().toLowerCase()
    return byProduct
      .filter(p => !k || [p.name, p.code, p.category].some(x => String(x || '').toLowerCase().includes(k)))
      .sort((a, b) => (Number(a[sort.k]) - Number(b[sort.k])) * sort.dir)
  }, [byProduct, q, sort])
  const shown = showAll || q ? list : list.slice(0, 8)
  const top5 = useMemo(() => [...byProduct].sort((a, b) => b.benefisHtg - a.benefisHtg).slice(0, 5).filter(p => p.benefisHtg > 0), [byProduct])
  const topMax = top5[0]?.benefisHtg || 1
  const SortBtn = ({ k, children }) => (
    <button className={sort.k === k ? 'on' : ''} onClick={() => setSort(s => ({ k, dir: s.k === k ? -s.dir : -1 }))}>
      {children}{sort.k === k && (sort.dir < 0 ? <ChevronDown size={11}/> : <ChevronUp size={11}/>)}
    </button>
  )

  return (
    <>
      <div className="db-h2" style={{ flexWrap: 'wrap' }}>
        <div><h2>{tr(t, 'dashboard.profitReport', 'Benefis')}</h2><p>{tr(t, 'dashboard.profitSubtitle', 'Vant, kou machandiz, depans ak sa ki rete')}</p></div>
        <div className="r iv-chips" style={{ margin: 0, maxWidth: '100%' }}>
          {PERIODS.map(p => <button key={p.v} className={`iv-chip ${period === p.v ? 'on' : ''}`} onClick={() => setPeriod(p.v)}>{p.l}</button>)}
        </div>
      </div>

      {isError ? (
        <div className="iv-banner off"><span className="ic"><AlertTriangle size={16} color="#D97706"/></span><span className="grow">Pa ka chaje rapò benefis la.</span><button onClick={() => refetch()}><RefreshCw size={13} className={isFetching ? 'spin' : ''}/> Eseye ankò</button></div>
      ) : isLoading ? (
        <div className="pf-sum">{[0, 1, 2, 3, 4].map(i => <div key={i} className="rp-kpi"><div className="iv-sk" style={{ width: '50%', marginBottom: 12 }}/><div className="iv-sk" style={{ height: 22, width: '80%' }}/></div>)}</div>
      ) : (
        <>
          <div className="pf-sum">
            <Card label={tr(t, 'dashboard.totalSalesLabel', 'Vant')} value={tot.vant} icon={ShoppingCart} color="#1B2A8F" delay={0}/>
            <Card label={tr(t, 'dashboard.totalCostLabel', 'Kou machandiz')} value={tot.kout} icon={DollarSign} color="#C0392B" delay={50}/>
            <Card label="Benefis brit" value={tot.brit} icon={tot.brit >= 0 ? TrendingUp : TrendingDown} color={tot.brit >= 0 ? '#059669' : '#DC2626'} delay={100} sub="Vant − kou machandiz"/>
            <Card label={tr(t, 'dashboard.profitMargin', 'Maj')} value={tot.maj} pct icon={Award} color="#B45309" delay={150} sub={`${byProduct.length} pwodui analize`}/>
            <Card label="Benefis nèt" value={tot.net} icon={Wallet} color={tot.net >= 0 ? '#059669' : '#DC2626'} delay={200} sub={`− ${fmt0(tot.depans)} HTG depans · maj ${tot.majNet.toFixed(1)}%`}/>
          </div>

          {losers.length > 0 && (
            <div className="iv-banner off" style={{ marginTop: 14 }}>
              <span className="ic"><TrendingDown size={16} color="#DC2626"/></span>
              <span className="grow"><b>{losers.length} pwodui ap fè pèt</b> — pri vann yo pi ba pase kou a: {losers.slice(0, 3).map(p => p.name).join(', ')}{losers.length > 3 ? '…' : ''}</span>
              <button onClick={() => { setSort({ k: 'benefisHtg', dir: 1 }); setShowAll(true) }}>Wè yo</button>
            </div>
          )}

          {!byProduct.length && !daily.length ? (
            <div className="iv-empty"><div className="art"><div className="paper"><i/><i/><i/><i/></div><div className="bubble"><TrendingUp size={18}/></div></div>
              <h3>{tr(t, 'dashboard.noDataPeriod', 'Pa gen done')}</h3><p>{tr(t, 'dashboard.noDataHint', 'Pa gen vant nan peryòd sa a.')}</p></div>
          ) : (
            <div className="rp-cols" style={{ marginTop: 16 }}>
              {daily.length > 0 ? (
                <section className="iv-sec a-up">
                  <div className="iv-sec-h">
                    <div className="n" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}><TrendingUp size={17}/></div>
                    <div><p className="eb">Chak jou</p><h3>{tr(t, 'dashboard.dailyEvolution', 'Evolisyon')}</h3></div>
                    <div className="r"><button className="iv-mini" onClick={() => setBig(b => !b)} aria-label="Agrandi">{big ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button></div>
                  </div>
                  <div className="pf-leg" style={{ marginBottom: 6 }}>
                    <span><i style={{ background: '#1B2A8F' }}/> Vant</span><span><i style={{ background: '#E57373' }}/> Kou</span><span><i style={{ background: '#10B981' }}/> Benefis</span>
                  </div>
                  <Bars data={daily} height={big ? 280 : 180} format={fmtK} labelEvery={daily.length > 16 ? 5 : daily.length > 8 ? 2 : 1}
                    series={[{ key: 'vant', name: 'Vant', color: '#1B2A8F' }, { key: 'kout', name: 'Kou', color: '#E57373' }, { key: 'ben', name: 'Benefis', color: '#10B981' }]}/>
                </section>
              ) : <div/>}

              <section className="iv-sec a-up" style={{ animationDelay: '60ms' }}>
                <div className="iv-sec-h">
                  <div className="n" style={{ background: 'linear-gradient(135deg,#E0B84C,#A87B12)' }}><Award size={17}/></div>
                  <div><p className="eb">Sa ki rapòte plis</p><h3>{tr(t, 'dashboard.top5Products', 'Top 5 benefis')}</h3></div>
                </div>
                {top5.length ? top5.map((p, i) => (
                  <div key={p.productId || i} className="rp-rank" style={{ '--mc': i === 0 ? '#F59E0B' : '#10B981', animationDelay: `${i * 45}ms` }}>
                    <span className={`no ${i < 3 ? `g${i + 1}` : ''}`}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</b>
                      <small style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtQty(p.qteVann)} {p.unit || ''} vann · maj {p.majPct.toFixed(1)}%</small>
                    </span>
                    <span className="amt"><b style={{ color: 'var(--ok)' }}>+{fmt0(p.benefisHtg)}</b><small>HTG</small></span>
                    <span className="meter" style={{ width: `${(p.benefisHtg / topMax) * 100}%` }}/>
                  </div>
                )) : <p className="iv-note" style={{ margin: 0 }}>Okenn pwodui pa fè benefis nan peryòd sa a.</p>}
              </section>
            </div>
          )}

          {byProduct.length > 0 && (
            <section className="iv-sec a-up" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', flexWrap: 'wrap' }}>
                <div className="iv-sec-h" style={{ margin: 0, flex: '1 1 200px' }}>
                  <div className="n"><ArrowDownUp size={17}/></div>
                  <div><p className="eb">{byProduct.length} pwodui</p><h3>{tr(t, 'dashboard.productDetail', 'Detay pa pwodui')}</h3></div>
                </div>
                <div className="iv-search" style={{ flex: '1 1 220px', minWidth: 0 }}><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Chèche pwodui…"/></div>
                <select className="iv-inp m-sort" style={{ width: 'auto', minHeight: 44 }} value={`${sort.k}:${sort.dir}`} onChange={e => { const [k, d] = e.target.value.split(':'); setSort({ k, dir: Number(d) }) }} aria-label="Triye">
                  <option value="benefisHtg:-1">Plis benefis</option>
                  <option value="benefisHtg:1">Mwens benefis</option>
                  <option value="majPct:-1">Pi gwo maj</option>
                  <option value="vantHtg:-1">Plis vant</option>
                  <option value="qteVann:-1">Plis kantite</option>
                </select>
              </div>
              <div className="pf-row hd">
                <span>Pwodui</span><span className="x">Kategori</span>
                <span className="r"><SortBtn k="qteVann">Qte</SortBtn></span>
                <span className="r"><SortBtn k="vantHtg">Vant</SortBtn></span>
                <span className="r">Kou</span>
                <span className="r"><SortBtn k="benefisHtg">Benefis</SortBtn></span>
                <span className="r"><SortBtn k="majPct">Maj</SortBtn></span>
              </div>
              {shown.map((p, i) => {
                const pos = p.benefisHtg >= 0
                return (
                  <div key={p.productId || i} className={`pf-row ${pos ? '' : 'neg'}`} style={{ animationDelay: `${Math.min(i, 15) * 15}ms` }}>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</b>
                      <small style={{ fontSize: 11, color: 'var(--muted)' }}>{p.code && p.code !== '—' ? <span className="mono">{p.code} · </span> : null}{fmtQty(p.qteVann)} {p.unit || ''} · vant {fmt0(p.vantHtg)}</small>
                    </span>
                    <span className="x">{p.category ? <span className="iv-badge" style={{ background: 'var(--infoBg)', color: 'var(--blue)' }}>{p.category}</span> : '—'}</span>
                    <span className="r x num" style={{ fontSize: 15 }}>{fmtQty(p.qteVann)}</span>
                    <span className="r x num" style={{ fontSize: 15, color: 'var(--blue)' }}>{fmt(p.vantHtg)}</span>
                    <span className="r x num" style={{ fontSize: 15, color: '#C0392B' }}>{fmt(p.koutHtg)}</span>
                    <span className="r ben">
                      <b className="num" style={{ fontSize: 16, color: pos ? 'var(--ok)' : 'var(--bad)' }}>{pos ? '+' : '−'}{fmt(Math.abs(p.benefisHtg))}</b>
                      <small className="m-only-inv" style={{ fontSize: 11, fontWeight: 800, color: pos ? 'var(--ok)' : 'var(--bad)' }}>{p.majPct.toFixed(1)}%</small>
                    </span>
                    <span className="r x"><span className="iv-badge" style={{ background: pos ? 'var(--okBg)' : 'var(--badBg)', color: pos ? 'var(--ok)' : 'var(--bad)' }}>{p.majPct.toFixed(1)}%</span></span>
                  </div>
                )
              })}
              {!q && list.length > 8 && (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <button className="iv-act" onClick={() => setShowAll(s => !s)}>
                    {showAll ? <><ChevronUp size={14}/> {tr(t, 'dashboard.showLess', 'Montre mwens')}</> : <><ChevronDown size={14}/> Wè tout {list.length} pwodui yo</>}
                  </button>
                </div>
              )}
              {q && !list.length && <p className="iv-note" style={{ margin: 14 }}>Okenn pwodui pa koresponn ak « {q} ».</p>}
            </section>
          )}
        </>
      )}
    </>
  )
}