// src/pages/enterprise/pre/PreComponents.jsx
// ═══════════════════════════════════════════════════════════════
// PRÈ — Konpozan UI. Baz yo (Modal, Field, AmountField, MethodPicker...)
// soti nan Kanè Epay pou de modil yo gen menm aparans.
// ═══════════════════════════════════════════════════════════════
import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import {
  ChevronDown, CalendarDays, Search, X, UserPlus, Link2, AlertTriangle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { STATUTS, STATUT_ECH } from './preConstants'
import { preAPI } from './preAPI'
import { buildPreShareHTML, PRE_RECEIPT_WIDTH } from './preUtils'
import { fmt } from '../kane-epay/kaneEpayUtils'
import { T, hexA } from '../kane-epay/kaneEpayConstants'
import {
  Spinner, Modal, Section, Field, AmountField, MethodPicker, Alert, Chip,
  AnimatedNumber, AnimatedInt, Track, Ring, GlassStat, Avatar, fmtInt,
} from '../kane-epay/KaneEpayComponents'

// Re-ekspòte baz yo pou lòt fichye Prè yo
export { Spinner, Modal, Section, Field, AmountField, MethodPicker, Alert, Chip, AnimatedNumber, AnimatedInt, Track, Ring, GlassStat, Avatar, fmtInt }

// ─── Inisyal + koulè pou non kliyan ──────────────────────────
export const iniNom = (nom = '') => nom.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
export function NameAvatar({ nom, size = 48, radius = 16 }) {
  const parts = (nom || '').trim().split(/\s+/)
  return <Avatar account={{ firstName: parts[0] || '?', lastName: parts.slice(1).join(' '), accountNumber: nom }} size={size} radius={radius} />
}

// ─── Stat kat ki ka klike (filtè) ────────────────────────────
export function StatCard({ label, value, num, format = fmtInt, suffix, icon, color = T.teal, pill, pct, delay = 0, onClick, active }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`ke-stat${active ? ' on' : ''}`}
      style={{ '--c': color, '--cbg': hexA(color, .1), '--cbg2': hexA(color, .14), animationDelay: `${delay}s` }}>
      <div className="ke-stat-top">
        <div className="ke-stat-ic">{icon}</div>
        {pill != null && <span className="ke-pill">{pill}</span>}
      </div>
      <p className="ke-stat-v">{num != null ? <AnimatedNumber value={num} format={format} /> : value}{suffix && <small>{suffix}</small>}</p>
      <p className="ke-stat-l">{label}</p>
      <Track pct={pct} color={color} />
      {onClick && <span className="go">Filtre →</span>}
    </Tag>
  )
}

// ─── Badj estati ─────────────────────────────────────────────
export function StatutBadge({ statut }) {
  const cfg = STATUTS[statut] || STATUTS.attente
  return <span className="ke-chip" style={{ '--c': cfg.color, '--cbg': cfg.bg }}>{cfg.icon}{cfg.label}</span>
}

// ─── Aperçu HTML resi (eskalade pou antre nan modal la) ──────
export function HtmlPreview({ html, width = PRE_RECEIPT_WIDTH }) {
  const wrapRef = useRef(null)
  const innerRef = useRef(null)
  const [box, setBox] = useState({ scale: 1, h: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth || width
      const scale = Math.min(1, w / width)
      setBox({ scale, h: (innerRef.current?.scrollHeight || 0) * scale })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(wrapRef.current)
    document.fonts?.ready?.then(measure).catch(() => {})
    return () => ro?.disconnect()
  }, [html, width])
  return (
    <div ref={wrapRef} className="ke-rcpt-wrap" style={{ height: box.h || undefined }}>
      <div ref={innerRef} className="ke-rcpt-inner"
        style={{ width, transform: `scale(${box.scale})`, margin: box.scale < 1 ? 0 : '0 auto' }}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
export const PreReceiptPreview = (props) => <HtmlPreview html={buildPreShareHTML(props)} />

// ─── Kalandriye peman ────────────────────────────────────────
export function KalandriyeSection({ preId }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['pre-echeances', preId],
    queryFn:  () => preAPI.echeances(preId).then(r => r.data.echeances || []),
    enabled:  open && !!preId,
  })
  const echeances       = data || []
  const totalReta       = echeances.filter(e => e.statut === 'reta' || e.statut === 'partiel').length
  const totalPaye       = echeances.filter(e => e.statut === 'paye').length
  const pct             = echeances.length ? Math.round((totalPaye / echeances.length) * 100) : 0
  const interetKouruTot = echeances.reduce((s, e) => s + Number(e.interet_kouru || 0), 0)
  const prochèn         = echeances.find(e => e.statut !== 'paye')
  const fmtD = (d, y = true) => new Date(d).toLocaleDateString('fr-HT', { day: '2-digit', month: 'short', ...(y && { year: 'numeric' }) })

  return (
    <div>
      <button className={`pre-cal-btn${open ? ' open' : ''}`} onClick={() => setOpen(v => !v)}>
        <span className="ke-stat-ic" style={{ width: 40, height: 40, borderRadius: 13, '--c': T.ink, background: T.night, color: T.gold }}><CalendarDays size={18} /></span>
        <span style={{ textAlign: 'left' }}>
          <span className="ke-d" style={{ display: 'block', fontSize: 19, letterSpacing: '.04em', textTransform: 'uppercase' }}>Kalandriye peman</span>
          <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{echeances.length ? `${echeances.length} echeans · ${pct}% peye` : 'Klike pou wè tout echeans yo'}</span>
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalReta > 0 && <Chip color={T.red}>{totalReta} reta</Chip>}
          <ChevronDown size={18} style={{ color: T.muted, transition: 'transform .25s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </span>
      </button>

      {open && (
        <div className="pre-cal-body">
          {isLoading ? (
            <div style={{ padding: 22, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', color: T.muted, fontWeight: 600 }}><Spinner /> Ap chaje...</div>
          ) : !echeances.length ? (
            <div style={{ padding: 20, textAlign: 'center', color: T.muted, fontWeight: 600 }}>Pa gen kalandriye disponib</div>
          ) : (
            <>
              <div className="pre-cal-sum">
                {[
                  { l: 'Peye',       v: totalPaye, c: T.green },
                  { l: 'Reta',       v: totalReta, c: T.red },
                  { l: 'Antant',     v: echeances.length - totalPaye - totalReta, c: T.muted },
                  { l: 'Int. kouru', v: fmt(interetKouruTot), c: T.orange },
                ].map(t => (
                  <div key={t.l} className="ke-mtile" style={{ '--c': t.c, '--cbg': hexA(t.c, .07) }}>
                    <p className="ke-label-s">{t.l}</p><p className="v" style={{ fontSize: 22 }}>{t.v}</p>
                  </div>
                ))}
              </div>
              {prochèn && (
                <div className="pre-next">
                  <div>
                    <span className="ke-eyebrow">Pwochen peman · #{prochèn.numero}</span>
                    <p style={{ margin: '5px 0 0', fontWeight: 700, fontSize: 13.5, color: prochèn.statut === 'reta' ? T.redD : '#f2f1ec' }}>
                      {fmtD(prochèn.dat_limit)}{prochèn.statut === 'reta' && ` · ${prochèn.jou_reta} jou reta`}
                    </p>
                  </div>
                  <span className="v" style={{ color: prochèn.statut === 'reta' ? T.redD : T.gold }}>
                    {fmt(Number(prochèn.montant_total) + Number(prochèn.interet_kouru || 0) - Number(prochèn.montant_paye || 0))}
                  </span>
                </div>
              )}
              <div className="pre-table">
                <table>
                  <thead><tr><th>#</th><th>Dat limit</th><th className="r">Balans</th><th className="r">Kapital</th><th className="r">Enterè</th><th>Estati</th></tr></thead>
                  <tbody>
                    {echeances.map(e => {
                      const cfg = STATUT_ECH[e.statut] || STATUT_ECH.attente
                      const ik = Number(e.interet_kouru || 0), mp = Number(e.montant_paye || 0)
                      const late = e.statut === 'reta' || e.statut === 'partiel'
                      return (
                        <tr key={e.id} className={late ? 'late' : ''}>
                          <td className="n">{e.numero}</td>
                          <td style={{ color: late ? T.red : T.ink }}>
                            {fmtD(e.dat_limit, false)}
                            {ik > 0 && <div style={{ fontSize: 11, color: T.red }}>+{fmt(ik)} ({e.jou_reta}j)</div>}
                          </td>
                          <td className="r" style={{ color: T.muted }}>{fmt(e.balans_avant)}</td>
                          <td className="r">{fmt(e.montant_capital)}</td>
                          <td className="r" style={{ color: T.orange }}>{fmt(e.montant_interet)}</td>
                          <td>
                            <span className="ke-chip" style={{ '--c': cfg.color, '--cbg': cfg.bg }}>{cfg.icon}{cfg.label}</span>
                            {mp > 0 && e.statut !== 'paye' && <div style={{ fontSize: 11, color: T.green, marginTop: 3 }}>Peye: {fmt(mp)}</div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot><tr>
                    <td /><td>TOTAL</td><td />
                    <td className="r">{fmt(echeances.reduce((s, e) => s + Number(e.montant_capital), 0))}</td>
                    <td className="r" style={{ color: T.orange }}>{fmt(echeances.reduce((s, e) => s + Number(e.montant_interet), 0))}</td>
                    <td />
                  </tr></tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Chèche kont Kanè Epay ───────────────────────────────────
export function KaneEpaySearch({ onSelect, selected, onClear, error }) {
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timeout = useRef(null)
  useEffect(() => () => clearTimeout(timeout.current), [])

  const handleSearch = (val) => {
    setQ(val); clearTimeout(timeout.current)
    if (val.length < 2) { setResults([]); return }
    timeout.current = setTimeout(async () => {
      setLoading(true)
      try { const res = await preAPI.kaneSearch(val); setResults(res.data.accounts || []) }
      catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }

  if (selected) return (
    <div className="pre-ks-sel">
      {selected.photoUrl
        ? <img src={selected.photoUrl} alt="" style={{ width: 46, height: 46, borderRadius: 15, objectFit: 'cover' }} />
        : <Avatar account={selected} size={46} radius={15} />}
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#fff' }}>{selected.firstName} {selected.lastName}</p>
        <p style={{ margin: '3px 0 0', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, letterSpacing: '.06em', color: T.gold }}>
          {selected.accountNumber} <span style={{ color: 'rgba(242,241,236,.6)' }}>· {fmt(selected.balance)} HTG</span>
        </p>
      </div>
      <button className="x" onClick={onClear} aria-label="Retire kont lan"><X size={16} /></button>
    </div>
  )

  return (
    <div className="pre-ks">
      <div className="ke-search" style={{ flex: 'none' }}>
        <Search size={18} className="lead" />
        <input placeholder="Chèche pa non, nimewo kont, telefòn..." value={q} onChange={e => handleSearch(e.target.value)}
          style={{ height: 50, borderRadius: 15, background: T.soft, ...(error && { borderColor: T.red }) }} />
        {loading && <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}><Spinner size={15} /></span>}
      </div>
      {results.length > 0 && (
        <div className="pre-ks-list">
          {results.map(acc => (
            <button key={acc.id} className="pre-ks-item" onClick={() => { onSelect(acc); setQ(''); setResults([]) }}>
              {acc.photoUrl ? <img src={acc.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 13, objectFit: 'cover' }} /> : <Avatar account={acc} size={40} radius={13} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{acc.firstName} {acc.lastName}</p>
                <p className="ke-acc-no" style={{ fontSize: 13 }}>{acc.accountNumber}</p>
              </div>
              <span className="ke-d" style={{ fontSize: 20 }}>{fmt(acc.balance)}</span>
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && !results.length && !loading && (
        <div className="pre-ks-list" style={{ padding: 16, textAlign: 'center', color: T.muted, fontWeight: 600, fontSize: 13 }}>
          Pa jwenn kont pou « <b style={{ color: T.ink }}>{q}</b> »
        </div>
      )}
      {error && <p className="ke-err"><AlertTriangle size={13} /> {error}</p>}
    </div>
  )
}

// ─── Avalize ─────────────────────────────────────────────────
export function AvalizelSection({ form, set, n }) {
  const [showAval2, setShowAval2] = useState(!!form.avalize2Nom)
  return (
    <Section n={n} title="Avalize" optional>
      <p className="ke-hint" style={{ margin: '-4px 0 12px' }}>Avalize yo siyen pou garanti prè a.</p>
      <label className="ke-label">Avalize 1</label>
      <div className="ke-two-r">
        <input className="ke-input" value={form.avalize1Nom || ''} onChange={e => set('avalize1Nom', e.target.value)} placeholder="Non konplè" />
        <input className="ke-input" inputMode="tel" value={form.avalize1Phone || ''} onChange={e => set('avalize1Phone', e.target.value)} placeholder="Telefòn" />
      </div>
      {!showAval2 ? (
        <button className="pre-add ke-mt" onClick={() => setShowAval2(true)}><UserPlus size={15} /> Ajoute avalize 2</button>
      ) : (
        <div className="ke-mt">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <label className="ke-label" style={{ margin: 0 }}>Avalize 2</label>
            <button className="ke-ibtn danger" style={{ width: 28, height: 28 }} onClick={() => { setShowAval2(false); set('avalize2Nom', ''); set('avalize2Phone', '') }} aria-label="Retire avalize 2"><X size={13} /></button>
          </div>
          <div className="ke-two-r">
            <input className="ke-input" value={form.avalize2Nom || ''} onChange={e => set('avalize2Nom', e.target.value)} placeholder="Non konplè" />
            <input className="ke-input" inputMode="tel" value={form.avalize2Phone || ''} onChange={e => set('avalize2Phone', e.target.value)} placeholder="Telefòn" />
          </div>
        </div>
      )}
    </Section>
  )
}

// ─── Ti tag (Kanè lye, enterè kouru) ─────────────────────────
export const KaneTag  = () => <Chip color={T.green} icon={<Link2 size={11} />}>Kanè</Chip>
export const KouruTag = () => <Chip color={T.red} icon={<AlertTriangle size={11} />}>Kouru</Chip>