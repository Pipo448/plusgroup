// src/pages/enterprise/pre/PreComponents.jsx
import { useState, useRef } from 'react'
import {
  ChevronDown, ChevronUp, TrendingUp, AlertCircle, CheckCircle,
  Clock, Search, X, UserPlus, Home,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { D, fmt, fmtDate, inputStyle, labelStyle } from '../kaneShared.jsx'
import { STATUTS, STATUT_ECH, PERIODES } from './preConstants'
import { preAPI } from './preAPI'

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 14, color = '#fff' }) {
  return <span style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

// ─── StatCard ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon, color, highlight }) {
  return (
    <div style={{ background: highlight ? `${color}15` : D.card, borderRadius: 12, padding: '12px 14px', border: `1px solid ${highlight ? color+'40' : D.cardBorder}`, boxShadow: D.shadow, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: D.muted, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: highlight ? color : D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────
export function Section({ icon, title, children }) {
  return (
    <div style={{ background: D.secBg, border: `1px solid ${D.secBorder}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────
export function Modal({ onClose, title, children, width = 540 }) {
  return (
    <div className="ke-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: D.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="ke-modal ke-sheet" style={{ background: D.card, border: `1px solid ${D.cardBorder}`, borderRadius: '18px 18px 0 0', width: '100%', maxWidth: width, maxHeight: '96vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', animation: 'sheetUp 0.24s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: `1px solid ${D.cardBorder}`, position: 'sticky', top: 0, background: D.card, zIndex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
        </div>
        <div style={{ padding: '16px 16px 36px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── StatutBadge ─────────────────────────────────────────────
export function StatutBadge({ statut }) {
  const cfg = STATUTS[statut] || STATUTS.attente
  return <span className="pre-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>{cfg.icon} {cfg.label}</span>
}

// ─── KalandriyeSection ───────────────────────────────────────
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

  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${D.gold}08`, border: `1px solid ${D.gold}25`, borderRadius: open ? '10px 10px 0 0' : 10, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={14} style={{ color: D.gold }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: D.gold }}>Kalandriye Peman</span>
          {echeances.length > 0 && <span style={{ fontSize: 10, color: D.muted }}>({echeances.length} echeans)</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalReta > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: D.red, background: D.redBg, padding: '2px 8px', borderRadius: 4 }}>{totalReta} reta</span>}
          {echeances.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: D.green }}>{pct}%</span>}
          {open ? <ChevronUp size={13} style={{ color: D.muted }} /> : <ChevronDown size={13} style={{ color: D.muted }} />}
        </div>
      </button>

      {open && (
        <div style={{ border: `1px solid ${D.gold}25`, borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: D.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Spinner color={D.gold} size={14} /> Ap chaje...
            </div>
          ) : echeances.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: D.muted, fontSize: 12 }}>Pa gen kalandriye disponib</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: D.cardBorder }}>
                {[
                  { label: 'Peye',       val: totalPaye,                           color: D.green  },
                  { label: 'Reta',       val: totalReta,                           color: D.red    },
                  { label: 'Antant',     val: echeances.length-totalPaye-totalReta, color: D.muted },
                  { label: 'Int. Kouru', val: `${fmt(interetKouruTot)} G`,          color: D.orange },
                ].map(item => (
                  <div key={item.label} style={{ background: D.card, padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>{item.label}</p>
                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: item.color, margin: 0 }}>{item.val}</p>
                  </div>
                ))}
              </div>

              {prochèn && (
                <div style={{ padding: '10px 14px', background: `${D.blue}08`, borderBottom: `1px solid ${D.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Pwochen Peman</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: prochèn.statut === 'reta' ? D.red : D.text, margin: 0 }}>
                      #{prochèn.numero} — {new Date(prochèn.dat_limit).toLocaleDateString('fr-HT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {prochèn.statut === 'reta' && <p style={{ fontSize: 10, color: D.red, margin: '2px 0 0' }}>⚠️ {prochèn.jou_reta} jou reta</p>}
                  </div>
                  <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: prochèn.statut === 'reta' ? D.red : D.blue, margin: 0 }}>
                    {fmt(Number(prochèn.montant_total) + Number(prochèn.interet_kouru || 0) - Number(prochèn.montant_paye || 0))} HTG
                  </p>
                </div>
              )}

              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 90px 1fr 70px 70px 65px', gap: 4, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${D.cardBorder}`, position: 'sticky', top: 0 }}>
                  {['#', 'Dat Limit', 'Balans', 'Capital', 'Enterè', 'Estati'].map(h => (
                    <span key={h} style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700 }}>{h}</span>
                  ))}
                </div>
                {echeances.map(e => {
                  const cfg   = STATUT_ECH[e.statut] || STATUT_ECH.attente
                  const ik    = Number(e.interet_kouru || 0)
                  const mp    = Number(e.montant_paye  || 0)
                  const isReta = e.statut === 'reta' || e.statut === 'partiel'
                  return (
                    <div key={e.id} className="pre-ech-row" style={{ display: 'grid', gridTemplateColumns: '28px 90px 1fr 70px 70px 65px', gap: 4, padding: '7px 12px', borderBottom: `1px solid ${D.cardBorder}`, background: isReta ? `${D.red}05` : 'transparent' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, alignSelf: 'center' }}>{e.numero}</span>
                      <div style={{ alignSelf: 'center' }}>
                        <p style={{ fontSize: 11, color: isReta ? D.red : D.text, margin: 0, fontWeight: isReta ? 700 : 400 }}>
                          {new Date(e.dat_limit).toLocaleDateString('fr-HT', { day: '2-digit', month: 'short' })}
                        </p>
                        {ik > 0 && <p style={{ fontSize: 9, color: D.red, margin: '1px 0 0' }}>+{fmt(ik)} ({e.jou_reta}j)</p>}
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.muted, alignSelf: 'center' }}>{fmt(e.balans_avant)}</span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.gold, alignSelf: 'center' }}>{fmt(e.montant_capital)}</span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.orange, alignSelf: 'center' }}>{fmt(e.montant_interet)}</span>
                      <div style={{ alignSelf: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {mp > 0 && e.statut !== 'paye' && <p style={{ fontSize: 9, color: D.green, margin: '2px 0 0' }}>Peye: {fmt(mp)}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 90px 1fr 70px 70px 65px', gap: 4, padding: '7px 12px', background: 'rgba(255,255,255,0.03)', borderTop: `1px solid ${D.cardBorder}` }}>
                <span /><span style={{ fontSize: 10, fontWeight: 700, color: D.muted }}>TOTAL</span><span />
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: D.gold }}>{fmt(echeances.reduce((s,e)=>s+Number(e.montant_capital),0))}</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: D.orange }}>{fmt(echeances.reduce((s,e)=>s+Number(e.montant_interet),0))}</span>
                <span />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── KaneEpaySearch ───────────────────────────────────────────
export function KaneEpaySearch({ onSelect, selected, onClear }) {
  const [q, setQ]           = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timeout               = useRef(null)

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: D.greenBg, border: `1px solid ${D.green}30` }}>
      {selected.photoUrl
        ? <img src={selected.photoUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
        : <div style={{ width: 34, height: 34, borderRadius: 8, background: D.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.gold, fontWeight: 800, fontSize: 13 }}>
            {selected.firstName?.[0]}{selected.lastName?.[0]}
          </div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D.text }}>{selected.firstName} {selected.lastName}</p>
        <p style={{ margin: 0, fontSize: 10, color: D.muted, fontFamily: 'monospace' }}>{selected.accountNumber} • {fmt(selected.balance)} HTG</p>
      </div>
      <button onClick={onClear} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.07)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={13} />
      </button>
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
        <input className="ke-input" style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }}
          placeholder="Chèche pa non, nimewo, telefòn..." value={q} onChange={e => handleSearch(e.target.value)} />
        {loading && <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)' }}><Spinner size={12} color={D.gold} /></span>}
      </div>
      {results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: D.card, border: `1px solid ${D.cardBorder}`, borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: D.shadow }}>
          {results.map(acc => (
            <button key={acc.id} className="pre-kane-item" onClick={() => { onSelect(acc); setQ(''); setResults([]) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: `1px solid ${D.cardBorder}`, textAlign: 'left' }}>
              {acc.photoUrl
                ? <img src={acc.photoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: 7, background: D.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.gold, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                    {acc.firstName?.[0]}{acc.lastName?.[0]}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: D.text }}>{acc.firstName} {acc.lastName}</p>
                <p style={{ margin: 0, fontSize: 10, color: D.muted, fontFamily: 'monospace' }}>{acc.accountNumber} • {fmt(acc.balance)} HTG</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && results.length === 0 && !loading && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: D.card, border: `1px solid ${D.cardBorder}`, borderRadius: 10, marginTop: 4, padding: '12px', textAlign: 'center', boxShadow: D.shadow }}>
          <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>Pa jwenn kont pou "<strong style={{ color: D.text }}>{q}</strong>"</p>
        </div>
      )}
    </div>
  )
}

// ─── AvalizelSection ─────────────────────────────────────────
export function AvalizelSection({ form, set }) {
  const [showAval2, setShowAval2] = useState(!!form.avalize2Nom)
  return (
    <Section icon="🤝" title="Avalize (Opsyonèl)">
      <p style={{ fontSize: 11, color: D.muted, margin: '0 0 10px' }}>Avalize yo siyen pou garanti prè a.</p>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...labelStyle, color: D.blue }}>Avalize 1</label>
        <div className="ke-form-row">
          <input className="ke-input" style={{ ...inputStyle, flex: 1 }} value={form.avalize1Nom || ''} onChange={e => set('avalize1Nom', e.target.value)} placeholder="Non konplè avalize 1..." />
          <input className="ke-input" style={{ ...inputStyle, flex: 1 }} value={form.avalize1Phone || ''} onChange={e => set('avalize1Phone', e.target.value)} placeholder="Telefòn..." />
        </div>
      </div>
      {!showAval2 ? (
        <button onClick={() => setShowAval2(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: `1px dashed ${D.cardBorder}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <UserPlus size={13} /> Ajoute Avalize 2 (opsyonèl)
        </button>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...labelStyle, color: D.blue, margin: 0 }}>Avalize 2</label>
            <button onClick={() => { setShowAval2(false); set('avalize2Nom', ''); set('avalize2Phone', '') }}
              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={11} />
            </button>
          </div>
          <div className="ke-form-row">
            <input className="ke-input" style={{ ...inputStyle, flex: 1 }} value={form.avalize2Nom || ''} onChange={e => set('avalize2Nom', e.target.value)} placeholder="Non konplè avalize 2..." />
            <input className="ke-input" style={{ ...inputStyle, flex: 1 }} value={form.avalize2Phone || ''} onChange={e => set('avalize2Phone', e.target.value)} placeholder="Telefòn..." />
          </div>
        </div>
      )}
    </Section>
  )
}
