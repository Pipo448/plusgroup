// ═══════════════════════════════════════════════════════════════
// KOMPONAN: EcheancierSection — Kalandriye Peman
// Ajoute sa nan ModalDetailPre, anba "Istwa Peman"
// Itilize: import { EcheancierSection } from './EcheancierSection'
// ═══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { D, fmt, } from './kaneShared.jsx'

const STATUT_CFG = {
  paye:    { label: 'Peye',    color: D.green,  bg: D.greenBg,               icon: <CheckCircle size={11}/> },
  partiel: { label: 'Pasyèl', color: D.orange, bg: D.orangeBg,              icon: <Clock size={11}/> },
  reta:    { label: 'Reta',   color: D.red,    bg: D.redBg,                 icon: <AlertCircle size={11}/> },
  attente: { label: 'Antant', color: D.muted,  bg: 'rgba(107,122,153,0.1)', icon: <Clock size={11}/> },
}

function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'short', year:'numeric' }) }
  catch { return '' }
}

export function EcheancierSection({ echeances = [], tauxInteret }) {
  const [expanded, setExpanded] = useState(false)

  if (!echeances.length) return null

  // Stats rezime
  const totalPaye   = echeances.filter(e => e.statut === 'paye').length
  const totalReta   = echeances.filter(e => e.statut === 'reta' || e.statut === 'partiel').length
  const totalAntant = echeances.filter(e => e.statut === 'attente').length
  const pctKonplè   = Math.round((totalPaye / echeances.length) * 100)

  const interetKouruTotal = echeances.reduce((s, e) => s + Number(e.interet_kouru || 0), 0)

  // Prochèn echeans
  const prochèn = echeances.find(e => e.statut !== 'paye')

  return (
    <div style={{ marginTop: 8 }}>
      {/* Tèt seksyon */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${D.gold}08`, border: `1px solid ${D.gold}25`, borderRadius: expanded ? '10px 10px 0 0' : 10, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={14} style={{ color: D.gold }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: D.gold }}>Kalandriye Peman</span>
          <span style={{ fontSize: 10, color: D.muted }}>({echeances.length} echeans)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalReta > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: D.red, background: D.redBg, padding: '2px 8px', borderRadius: 4 }}>
              {totalReta} reta
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: D.green }}>{pctKonplè}%</span>
          {expanded ? <ChevronUp size={13} style={{ color: D.muted }} /> : <ChevronDown size={13} style={{ color: D.muted }} />}
        </div>
      </button>

      {expanded && (
        <div style={{ border: `1px solid ${D.gold}25`, borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>

          {/* Rezime rapid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: D.cardBorder }}>
            {[
              { label: 'Peye',   val: totalPaye,   color: D.green  },
              { label: 'Reta',   val: totalReta,   color: D.red    },
              { label: 'Antant', val: totalAntant, color: D.muted  },
              { label: 'Enterè Kouru', val: `${fmt(interetKouruTotal)} G`, color: D.orange },
            ].map(item => (
              <div key={item.label} style={{ background: D.card, padding: '8px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>{item.label}</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: item.color, margin: 0 }}>{item.val}</p>
              </div>
            ))}
          </div>

          {/* Prochèn echeans */}
          {prochèn && prochèn.statut !== 'paye' && (
            <div style={{ padding: '10px 14px', background: `${D.blue}08`, borderBottom: `1px solid ${D.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ fontSize: 10, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Pwochen Peman</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>
                  #{prochèn.numero} — {fmtDate(prochèn.dat_limit)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: prochèn.statut === 'reta' ? D.red : D.blue, margin: 0 }}>
                  {fmt(Number(prochèn.montant_total) + Number(prochèn.interet_kouru || 0) - Number(prochèn.montant_paye || 0))} HTG
                </p>
                {Number(prochèn.interet_kouru) > 0 && (
                  <p style={{ fontSize: 10, color: D.red, margin: '2px 0 0' }}>
                    dont {fmt(prochèn.interet_kouru)} HTG enterè kouru
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tablo echeans */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 80px 70px', gap: 4, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${D.cardBorder}` }}>
              {['#', 'Dat Limit', 'Capital', 'Enterè', 'Total', 'Estati'].map(h => (
                <span key={h} style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700 }}>{h}</span>
              ))}
            </div>

            {echeances.map(e => {
              const cfg = STATUT_CFG[e.statut] || STATUT_CFG.attente
              const interetKouru = Number(e.interet_kouru || 0)
              const montantPaye  = Number(e.montant_paye  || 0)
              const resteEch     = Number(e.montant_total) + interetKouru - montantPaye
              const isReta       = e.statut === 'reta' || e.statut === 'partiel'

              return (
                <div key={e.id} style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 80px 70px', gap: 4,
                  padding: '8px 12px', borderBottom: `1px solid ${D.cardBorder}`,
                  background: e.statut === 'paye' ? 'transparent' : isReta ? `${D.red}05` : 'transparent',
                }}>
                  {/* Numero */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, alignSelf: 'center' }}>{e.numero}</span>

                  {/* Dat + enterè kouru si reta */}
                  <div>
                    <p style={{ fontSize: 11, color: isReta ? D.red : D.text, margin: 0, fontWeight: isReta ? 700 : 400 }}>
                      {fmtDate(e.dat_limit)}
                    </p>
                    {interetKouru > 0 && (
                      <p style={{ fontSize: 9, color: D.red, margin: '1px 0 0' }}>
                        +{fmt(interetKouru)} kouru ({e.jou_reta}j)
                      </p>
                    )}
                    {montantPaye > 0 && e.statut !== 'paye' && (
                      <p style={{ fontSize: 9, color: D.green, margin: '1px 0 0' }}>
                        Deja: {fmt(montantPaye)}
                      </p>
                    )}
                  </div>

                  {/* Capital */}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.gold, alignSelf: 'center' }}>
                    {fmt(e.montant_capital)}
                  </span>

                  {/* Enterè */}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.orange, alignSelf: 'center' }}>
                    {fmt(e.montant_interet)}
                  </span>

                  {/* Total (avèk enterè kouru si reta) */}
                  <div style={{ alignSelf: 'center' }}>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: e.statut === 'paye' ? D.green : isReta ? D.red : D.text, margin: 0 }}>
                      {fmt(resteEch > 0 ? resteEch : e.montant_total)}
                    </p>
                  </div>

                  {/* Estati */}
                  <div style={{ alignSelf: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pye paj — total */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 80px 70px', gap: 4, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderTop: `1px solid ${D.cardBorder}` }}>
            <span />
            <span style={{ fontSize: 10, fontWeight: 700, color: D.muted }}>TOTAL</span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: D.gold }}>
              {fmt(echeances.reduce((s, e) => s + Number(e.montant_capital), 0))}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: D.orange }}>
              {fmt(echeances.reduce((s, e) => s + Number(e.montant_interet), 0))}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: D.text }}>
              {fmt(echeances.reduce((s, e) => s + Number(e.montant_total), 0))}
            </span>
            <span />
          </div>
        </div>
      )}
    </div>
  )
}