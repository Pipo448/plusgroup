// src/pages/enterprise/pre/PreModals.jsx
// Modals: ModalCreePre, ModalPaieman, ModalKapital, ModalRapoKesye, ModalDetailPre
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import {
  Plus, X, Printer, CheckCircle, Clock, AlertCircle, DollarSign,
  ShieldCheck, PiggyBank, FileText, Lock, ArrowDownCircle,
  Home, UserPlus, Trash2,
} from 'lucide-react'
import { D, fmt, fmtDate, inputStyle, labelStyle, PAYMENT_METHODS } from '../kaneShared.jsx'
import { STATUTS, PERIODES, TIP_KALKIL } from './preConstants'
import { preAPI } from './preAPI'
import { calcPreviewEcheances, calcNbrPeman } from './preCalc'
import {
  Spinner, StatCard, Section, Modal, StatutBadge,
  KalandriyeSection, KaneEpaySearch, AvalizelSection,
} from './PreComponents'

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE PRÈ
// ═══════════════════════════════════════════════════════════════
export function ModalCreePre({ onClose, onSuccess, printer, kesFemen }) {
  const { tenant } = useAuthStore()
  const [kaneKont, setKaneKont] = useState(null)
  const [form, setForm] = useState({
    montant: '', tauxInteret: '', dureeEnMois: '6',
    datDebut: new Date().toISOString().split('T')[0],
    periode: 'mois', montantBloke: '', tipKalkil: 'declining',
    pemaParJou: '', nombreJou: '', method: 'cash', reference: '', notes: '',
    garantiByens: '', avalize1Nom: '', avalize1Phone: '', avalize2Nom: '', avalize2Phone: '',
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const isBousSoleil = form.tipKalkil === 'bous_soleil'
  const kapital  = Number(form.montant || 0)
  const nbrPeman = isBousSoleil ? Number(form.nombreJou || 0) : calcNbrPeman(Number(form.dureeEnMois || 1), form.periode)

  let previewData = { pmtMwayèn:0, pmt:0, premyePeman:0, dènyePeman:0, totalDu:0, totalInteret:0 }
  if (isBousSoleil) {
    const pjou = Number(form.pemaParJou || 0), njou = Number(form.nombreJou || 0)
    if (kapital > 0 && pjou > 0 && njou > 0) {
      const totalDu = Math.round(pjou * njou * 100) / 100
      previewData = { pmtMwayèn: pjou, pmt: pjou, premyePeman: pjou, dènyePeman: pjou, totalDu, totalInteret: Math.round((totalDu - kapital)*100)/100 }
    }
  } else {
    previewData = calcPreviewEcheances(kapital, Number(form.tauxInteret || 0), nbrPeman, form.periode, form.tipKalkil)
  }
  const { pmtMwayèn, premyePeman, dènyePeman, totalDu, totalInteret } = previewData
  const tipCfg = TIP_KALKIL.find(t => t.value === form.tipKalkil) || TIP_KALKIL[1]

  // ✅ Hook anvan kondisyonèl
  const mutation = useMutation({
    mutationFn: (d) => preAPI.create(d),
    onSuccess: async (res) => {
      toast.success(`✅ Prè ${res.data.pre.numeroPre} kreye!`)
      onSuccess()
      try { printer.printPre({ pre: res.data.pre, echeances: res.data.echeances || [], tenant, type: 'ouverture' }) } catch {}
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè kreyasyon prè.'),
  })

  if (kesFemen) return (
    <Modal onClose={onClose} title="💸 Nouvo Prè" width={420}>
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <Lock size={40} style={{ color: D.red, margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: D.red, margin: '0 0 8px' }}>Kès Fèmen</p>
        <p style={{ fontSize: 13, color: D.muted, margin: '0 0 20px' }}>Ou pa ka kreye nouvo prè jodi a.</p>
        <button className="ke-btn" onClick={onClose} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, cursor: 'pointer' }}>Konprann</button>
      </div>
    </Modal>
  )

  const validate = () => {
    const e = {}
    if (!kaneKont) e.kane = 'Chwazi yon kont Kanè Epay obligatwa'
    if (isBousSoleil) {
      if (kapital <= 0) e.montant = 'Kapital dwe > 0'
      if (!form.pemaParJou || Number(form.pemaParJou) <= 0) e.pemaParJou = 'Peman pa jou obligatwa'
      if (!form.nombreJou  || Number(form.nombreJou)  <= 0) e.nombreJou  = 'Nombre jou obligatwa'
      if (Number(form.pemaParJou) * Number(form.nombreJou) <= kapital) e.pemaParJou = 'Total peman dwe plis ke kapital'
    } else {
      if (kapital <= 0)      e.montant = 'Montan dwe > 0'
      if (!form.tauxInteret) e.taux    = 'To enterè obligatwa'
      if (!form.dureeEnMois) e.duree   = 'Dire obligatwa'
    }
    setErrors(e); return !Object.keys(e).length
  }

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      clientNom: `${kaneKont.firstName} ${kaneKont.lastName}`,
      clientPhone: kaneKont.phone || undefined, clientNifCin: kaneKont.nifOrCin || undefined,
      kontKaneEpayId: kaneKont.id, montant: kapital,
      tauxInteret: isBousSoleil ? 0 : Number(form.tauxInteret),
      dureeEnMois: isBousSoleil ? Math.ceil(Number(form.nombreJou)/30) : Number(form.dureeEnMois),
      montantBloke: Number(form.montantBloke||0), tipKalkil: form.tipKalkil,
      pemaParJou: isBousSoleil ? Number(form.pemaParJou) : undefined,
      nombreJou:  isBousSoleil ? Number(form.nombreJou)  : undefined,
      datDebut: form.datDebut, periode: form.periode, method: form.method,
      reference: form.reference||undefined, notes: form.notes||undefined,
      garantiByens: form.garantiByens||undefined,
      avalize1Nom: form.avalize1Nom||undefined, avalize1Phone: form.avalize1Phone||undefined,
      avalize2Nom: form.avalize2Nom||undefined, avalize2Phone: form.avalize2Phone||undefined,
    })
  }

  return (
    <Modal onClose={onClose} title="💸 Nouvo Prè" width={600}>
      <Section icon="🔗" title="Kont Kanè Epay (Obligatwa)">
        <KaneEpaySearch selected={kaneKont} onSelect={setKaneKont} onClear={() => setKaneKont(null)} />
        {errors.kane && <p style={{ fontSize: 10, color: D.red, margin: '6px 0 0' }}><AlertCircle size={11}/> {errors.kane}</p>}
      </Section>

      <Section icon="⚙️" title="Tip Kalkil Enterè">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TIP_KALKIL.map(tip => (
            <button key={tip.value} onClick={() => set('tipKalkil', tip.value)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${form.tipKalkil===tip.value ? tip.color+'60' : D.cardBorder}`, background: form.tipKalkil===tip.value ? `${tip.color}10` : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{tip.emoji}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: form.tipKalkil===tip.value ? tip.color : D.text, margin: '0 0 2px' }}>{tip.label}</p>
                <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{tip.desc}</p>
              </div>
              {form.tipKalkil===tip.value && <CheckCircle size={14} style={{ color: tip.color, flexShrink: 0, marginLeft: 'auto', marginTop: 2 }}/>}
            </button>
          ))}
        </div>
      </Section>

      <Section icon="💰" title="Tèm Finansye">
        {isBousSoleil ? (
          <>
            <label style={labelStyle}>Kapital (HTG) *</label>
            <input type="number" min="0" step="0.01" className="ke-input"
              style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center', color: D.gold, marginBottom: 10, borderColor: errors.montant ? D.red : undefined }}
              value={form.montant} onChange={e => set('montant', e.target.value)} placeholder="5,000.00" onFocus={e => e.target.select()}/>
            {errors.montant && <p style={{ fontSize: 10, color: D.red, margin: '-6px 0 8px' }}>{errors.montant}</p>}
            <div className="ke-form-row">
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, color: tipCfg.color }}>Peman Pa Jou (HTG) *</label>
                <input type="number" min="1" step="0.01" className="ke-input"
                  style={{ ...inputStyle, color: tipCfg.color, borderColor: errors.pemaParJou ? D.red : `${tipCfg.color}40` }}
                  value={form.pemaParJou} onChange={e => set('pemaParJou', e.target.value)} placeholder="200" onFocus={e => e.target.select()}/>
                {errors.pemaParJou && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.pemaParJou}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, color: D.blue }}>Nombre Jou *</label>
                <input type="number" min="1" max="365" className="ke-input"
                  style={{ ...inputStyle, color: D.blue, borderColor: errors.nombreJou ? D.red : `${D.blue}40` }}
                  value={form.nombreJou} onChange={e => set('nombreJou', e.target.value)} placeholder="30" onFocus={e => e.target.select()}/>
                {errors.nombreJou && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.nombreJou}</p>}
              </div>
            </div>
            {kapital > 0 && Number(form.pemaParJou) > 0 && Number(form.nombreJou) > 0 && (
              <div style={{ marginTop: 12, background: D.card, borderRadius: 10, padding: '12px 14px', border: `1px solid ${tipCfg.color}30`, textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: tipCfg.color, margin: 0 }}>
                  {fmt(Number(form.pemaParJou))} G × {form.nombreJou} jou = <strong style={{ fontSize: 15 }}>{fmt(totalDu)} G</strong>
                </p>
                <p style={{ fontSize: 11, color: D.orange, margin: '4px 0 0' }}>Enterè: {fmt(totalInteret)} G</p>
              </div>
            )}
          </>
        ) : (
          <>
            <input type="number" min="0" step="0.01" className="ke-input"
              style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center', color: D.gold, marginBottom: 10, borderColor: errors.montant ? D.red : undefined }}
              value={form.montant} onChange={e => set('montant', e.target.value)} placeholder="0.00" onFocus={e => e.target.select()}/>
            {errors.montant && <p style={{ fontSize: 10, color: D.red, margin: '-6px 0 8px' }}>{errors.montant}</p>}
            <div className="ke-form-row">
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, color: D.orange }}>To Enterè (% / mwa) *</label>
                <input type="number" min="0" max="100" step="0.1" className="ke-input"
                  style={{ ...inputStyle, color: D.orange, borderColor: errors.taux ? D.red : `${D.orange}40` }}
                  value={form.tauxInteret} onChange={e => set('tauxInteret', e.target.value)} placeholder="ex: 3" onFocus={e => e.target.select()}/>
                {errors.taux && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.taux}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, color: D.blue }}>Dire (mwa) *</label>
                <input type="number" min="1" max="120" className="ke-input"
                  style={{ ...inputStyle, color: D.blue, borderColor: errors.duree ? D.red : `${D.blue}40` }}
                  value={form.dureeEnMois} onChange={e => set('dureeEnMois', e.target.value)} onFocus={e => e.target.select()}/>
              </div>
            </div>
            {kapital > 0 && form.tauxInteret && pmtMwayèn > 0 && (
              <div style={{ marginTop: 12, background: D.card, borderRadius: 10, padding: '12px 14px', border: `1px solid ${tipCfg.color}30` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: D.gold }}>💰 {fmt(kapital)}</span>
                  <span style={{ color: tipCfg.color }}>📈 +{fmt(totalInteret)}</span>
                  <span style={{ color: D.green, fontWeight: 700 }}>= {fmt(totalDu)} G</span>
                </div>
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <label style={{ ...labelStyle, color: D.gold }}>Garanti / Byens (opsyonèl)</label>
              <textarea className="ke-input" style={{ ...inputStyle, height: 56, resize: 'vertical', fontSize: 12 }}
                value={form.garantiByens} onChange={e => set('garantiByens', e.target.value)} placeholder="Kay, motosiklèt, tè..."/>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ ...labelStyle, color: D.purple }}>Depozit Bloke (opsyonèl)</label>
              <input type="number" min="0" step="0.01" className="ke-input"
                style={{ ...inputStyle, color: D.purple }}
                value={form.montantBloke} onChange={e => set('montantBloke', e.target.value)} placeholder="0.00" onFocus={e => e.target.select()}/>
            </div>
          </>
        )}
      </Section>

      <Section icon="📅" title="Kalandriye">
        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Dat Premye Peman</label>
            <input type="date" className="ke-input" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.datDebut} onChange={e => set('datDebut', e.target.value)}/>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Frekans Peman</label>
            <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.periode} onChange={e => set('periode', e.target.value)}>
              {PERIODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <AvalizelSection form={form} set={set} />

      <div className="ke-form-row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Metod Dekèsman</label>
          <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.method} onChange={e => set('method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Referans</label>
          <input className="ke-input" style={inputStyle} value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="MCash #..."/>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nòt</label>
        <textarea className="ke-input" style={{ ...inputStyle, height: 56, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Rezon, lòt enfòmasyon..."/>
      </div>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: D.muted }}>Tay papye:</span>
        {[57, 80].map(mm => (
          <button key={mm} onClick={() => printer.setLargeur(mm)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${printer.largeur===mm ? D.gold+'60' : D.cardBorder}`, background: printer.largeur===mm ? D.goldDim : 'transparent', color: printer.largeur===mm ? D.gold : D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            {mm}mm
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
        <button className="ke-btn" onClick={handleSubmit} disabled={mutation.isPending}
          style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, opacity: mutation.isPending ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {mutation.isPending ? <><Spinner color="#0a1222"/> Ap kreye...</> : <><Printer size={15}/> Kreye + Enprime Kontra</>}
        </button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: PEMAN
// ═══════════════════════════════════════════════════════════════
export function ModalPaieman({ pre, onClose, onSuccess, printer, kesFemen }) {
  const { tenant } = useAuthStore()
  const qc = useQueryClient()
  const [form, setForm] = useState({ montant: '', method: 'cash', reference: '' })
  const amt         = Number(form.montant || 0)
  const resteAPayer = Math.max(0, Number(pre.totalDu||0) - Number(pre.totalPaye||0))

  // ✅ Hook anvan kondisyonèl
  const mutation = useMutation({
    mutationFn: (d) => preAPI.paiement(pre.id, d),
    onSuccess: async (res) => {
      toast.success(`✅ Peman ${fmt(amt)} HTG anrejistre!`)
      qc.invalidateQueries(['pre-echeances', pre.id])
      onSuccess()
      try {
        const preAjou = res.data?.pre || { ...pre, totalPaye: Number(pre.totalPaye) + amt }
        const echPeye = (res.data?.echeances || []).filter(e => e.statut === 'paye' || e.statut === 'partiel')
        printer.printPre({ pre: preAjou, paiement: { montant: amt, method: form.method, reference: form.reference||null }, echeances: echPeye, tenant, type: 'paiement' })
      } catch {}
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè peman.'),
  })

  if (kesFemen) return (
    <Modal onClose={onClose} title={`💳 Peman — ${pre.numeroPre}`} width={420}>
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <Lock size={40} style={{ color: D.red, margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: D.red, margin: '0 0 8px' }}>Kès Fèmen</p>
        <p style={{ fontSize: 13, color: D.muted, margin: '0 0 20px' }}>Ou pa ka anrejistre peman apre ou fèmen kès la.</p>
        <button className="ke-btn" onClick={onClose} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, cursor: 'pointer' }}>Konprann</button>
      </div>
    </Modal>
  )

  return (
    <Modal onClose={onClose} title={`💳 Peman — ${pre.numeroPre}`} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: D.goldBtn, borderRadius: 12, padding: '12px 14px', color: '#0a1222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, margin: '0 0 2px' }}>{pre.clientNom}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{pre.numeroPre}</p>
          </div>
          <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, margin: 0 }}>{fmt(pre.montant)} HTG</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: D.greenBg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${D.green}20` }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', fontWeight: 700, textTransform: 'uppercase' }}>Deja Peye</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.green, margin: 0 }}>{fmt(pre.totalPaye||0)} HTG</p>
          </div>
          <div style={{ background: D.redBg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${D.red}20` }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', fontWeight: 700, textTransform: 'uppercase' }}>Rete Pou Peye</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.red, margin: 0 }}>{fmt(resteAPayer)} HTG</p>
          </div>
        </div>
        <div>
          <label style={{ ...labelStyle, color: D.green }}>Montan Peman (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="ke-input"
            style={{ ...inputStyle, fontSize: 26, fontWeight: 800, textAlign: 'center', borderColor: `${D.green}50`, color: D.green }}
            value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus/>
        </div>
        {resteAPayer > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[resteAPayer, resteAPayer/2, resteAPayer/4].filter(v => v > 0).map((v, i) => (
              <button key={i} className="ke-btn" onClick={() => setForm(p => ({ ...p, montant: v.toFixed(2) }))}
                style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${D.green}30`, background: D.greenBg, color: D.green, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                {i===0 ? 'Tout' : i===1 ? '½' : '¼'} ({fmt(v)})
              </button>
            ))}
          </div>
        )}
        {amt > 0 && (
          <div style={{ background: D.greenBg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${D.green}25`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.green }}>Rete apre peman:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: resteAPayer-amt<=0 ? D.gold : D.green }}>
              {fmt(Math.max(0, resteAPayer-amt))} HTG {resteAPayer-amt<=0 && '🎉'}
            </span>
          </div>
        )}
        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Metod</label>
            <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Referans</label>
            <input className="ke-input" style={inputStyle} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="MCash #..."/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button className="ke-btn" onClick={() => mutation.mutate({ montant: amt, method: form.method, reference: form.reference||undefined })}
            disabled={mutation.isPending || amt <= 0}
            style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: mutation.isPending||amt<=0 ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg,${D.green},${D.green}bb)`, color: '#fff', fontWeight: 800, fontSize: 14, opacity: mutation.isPending||amt<=0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {mutation.isPending ? <><Spinner/> Ap anrejistre...</> : <><ArrowDownCircle size={15}/> Konfime Peman</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: ENJEKTE KAPITAL — ✅ Edit 5 minit apre
// ═══════════════════════════════════════════════════════════════
export function ModalKapital({ onClose, onSuccess }) {
  const [form, setForm]       = useState({ montant: '', notes: '' })
  const [lastId, setLastId]   = useState(null)   // ID enjeksyon ki fèk kreye
  const [sekon,  setSekon]    = useState(0)       // Segond ki rete pou edite
  const [editing, setEditing] = useState(false)   // Mòd edisyon

  const amt = Number(form.montant || 0)

  // Countdown timer
  useEffect(() => {
    if (sekon <= 0) return
    const t = setInterval(() => setSekon(s => { if (s <= 1) { clearInterval(t); return 0 } return s - 1 }), 1000)
    return () => clearInterval(t)
  }, [sekon])

  const mutation = useMutation({
    mutationFn: (d) => preAPI.enjekteKapital(d),
    onSuccess: (res) => {
      toast.success(`✅ ${fmt(amt)} HTG enjekte!`)
      onSuccess()
      // Kounye a admin gen 5 minit pou edite
      if (res.data?.id) { setLastId(res.data.id); setSekon(300); setEditing(true) }
      else { onClose() }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè enjeksyon.'),
  })

  const mutEdit = useMutation({
    mutationFn: (d) => preAPI.updateKapital(lastId, d),
    onSuccess: (res) => {
      toast.success(`✅ Enjeksyon modifye — ${fmt(amt)} HTG!`)
      if (res.data?.expired) { toast.error('Limite 5 minit depase.'); onClose() }
      else { onSuccess(); onClose() }
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Erè modifikasyon.')
      if (e.response?.data?.expired) onClose()
    },
  })

  const fmtTimer = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const timerColor = sekon > 60 ? D.green : sekon > 20 ? D.orange : D.red

  return (
    <Modal onClose={onClose} title={editing ? '✏️ Modifye Enjeksyon' : '💼 Enjekte Kapital'} width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {editing && sekon > 0 && (
          <div style={{ background: `${timerColor}15`, border: `1px solid ${timerColor}40`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, color: timerColor, margin: 0, fontWeight: 700 }}>⏱ Tan pou modifye:</p>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: timerColor }}>{fmtTimer(sekon)}</span>
          </div>
        )}

        {editing && sekon === 0 && (
          <div style={{ background: D.redBg, border: `1px solid ${D.red}40`, borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, color: D.red, margin: 0, fontWeight: 700 }}>⛔ Limite 5 minit depase — pa ka modifye ankò.</p>
          </div>
        )}

        <div style={{ background: `${D.purple}10`, border: `1px solid ${D.purple}25`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PiggyBank size={16} style={{ color: D.purple, flexShrink: 0 }}/>
          <p style={{ fontSize: 12, color: D.purple, margin: 0 }}>
            {editing ? 'Modifye montan enjeksyon an — limite 5 minit apre kreye a.' : 'Lajan ou enjekte a ap disponib pou kesye yo ka prète kliyan.'}
          </p>
        </div>

        <div>
          <label style={{ ...labelStyle, color: D.purple }}>Montan (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="ke-input"
            style={{ ...inputStyle, fontSize: 26, fontWeight: 800, textAlign: 'center', color: D.purple, borderColor: `${D.purple}50` }}
            value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus/>
        </div>

        <div>
          <label style={labelStyle}>Nòt (opsyonèl)</label>
          <input className="ke-input" style={inputStyle} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Sous lajan, rezon..."/>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>
            {editing ? 'Fèmen' : 'Anile'}
          </button>

          {!editing ? (
            <button className="ke-btn" onClick={() => mutation.mutate({ montant: amt, notes: form.notes||undefined })}
              disabled={mutation.isPending || amt <= 0}
              style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: mutation.isPending||amt<=0 ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg,${D.purple},${D.purple}bb)`, color: '#fff', fontWeight: 800, fontSize: 14, opacity: mutation.isPending||amt<=0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {mutation.isPending ? <><Spinner/> Ap enjekte...</> : <><PiggyBank size={15}/> Konfime Enjeksyon</>}
            </button>
          ) : (
            <button className="ke-btn"
              onClick={() => sekon > 0 && mutEdit.mutate({ montant: amt, notes: form.notes||undefined })}
              disabled={mutEdit.isPending || amt <= 0 || sekon === 0}
              style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: mutEdit.isPending||amt<=0||sekon===0 ? 'not-allowed' : 'pointer', background: sekon > 0 ? `linear-gradient(135deg,${D.orange},${D.orange}bb)` : 'rgba(255,255,255,0.08)', color: sekon > 0 ? '#fff' : D.muted, fontWeight: 800, fontSize: 14, opacity: mutEdit.isPending||sekon===0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {mutEdit.isPending ? <><Spinner/> Ap modifye...</> : <><PiggyBank size={15}/> Sove Chanjman</>}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: FEMEN KÈS
// ═══════════════════════════════════════════════════════════════
export function ModalRapoKesye({ onClose, onKesFemen }) {
  const qc = useQueryClient()
  const [etap, setEtap] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [rapo, setRapo] = useState(null)
  const [montantFizik, setMontantFizik] = useState('')
  const [kaneStats, setKaneStats] = useState(null)
  const [preStats,  setPreStats]  = useState(null)

  useEffect(() => {
    api.get('/kane-epay/stats').then(r => setKaneStats(r.data.stats)).catch(() => {})
    api.get('/pre/stats').then(r => setPreStats(r.data.stats)).catch(() => {})
  }, [])

  const depoJou  = Number(kaneStats?.todayDepositAmount  || 0)
  const retrèJou = Number(kaneStats?.todayWithdrawAmount || 0)
  const kolPre   = Number(preStats?.totalPaiemanMwa || 0)
  const desPre   = Number(preStats?.totalDesèmanMwa || 0)
  const totalCashIn  = depoJou + kolPre
  const totalCashOut = retrèJou + desPre
  const netSystem    = totalCashIn - totalCashOut
  const montFizikNum = Number(montantFizik || 0)
  const diferans     = montFizikNum - netSystem
  const hasMontant   = montFizikNum > 0
  const difColor = Math.abs(diferans) < 0.01 ? D.green : diferans > 0 ? D.orange : D.red
  const difLabel = Math.abs(diferans) < 0.01 ? '✅ Balans kòrèkt' : diferans > 0 ? `📈 ${fmt(diferans)} HTG anplis` : `📉 ${fmt(Math.abs(diferans))} HTG mank`

  const handleFemen = async () => {
    if (!hasMontant) return
    setLoading(true)
    try {
      const notesFinale = [notes||'', `Montan fizik: ${fmt(montFizikNum)} HTG`, `Nèt sistèm: ${fmt(netSystem)} HTG`, `Diferans: ${diferans>=0?'+':''}${fmt(diferans)} HTG`].filter(Boolean).join(' | ')
      const res = await preAPI.femenKes({ notes: notesFinale })
      setRapo(res.data.rapo)
      toast.success('✅ Kès fèmen!')
      qc.invalidateQueries(['kes-status'])
      onKesFemen()
    } catch (e) { toast.error(e.response?.data?.message || 'Erè fèmen kès.') }
    finally { setLoading(false) }
  }

  return (
    <Modal onClose={onClose} title={`📊 Fèmen Kès${etap===2?' — Etap 2/2':''}`} width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {etap === 1 && !rapo && (
          <>
            <div style={{ background:`${D.orange}10`, border:`1px solid ${D.orange}25`, borderRadius:10, padding:'10px 14px' }}>
              <p style={{ fontSize:12, color:D.orange, margin:0 }}>⚠️ Fèmen kès la ap <strong>bloke tou 2 paj yo</strong> jiskaske demen.</p>
            </div>
            {kaneStats && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { label:'Depo Kane',   val:`${fmt(depoJou)} HTG`,  color:D.green },
                  { label:'Retrè Kane',  val:`${fmt(retrèJou)} HTG`, color:D.red   },
                  { label:'Koleksyon Prè', val:`${fmt(kolPre)} HTG`, color:D.green },
                  { label:'Dekèsman Prè', val:`${fmt(desPre)} HTG`,  color:D.orange},
                ].map(item => (
                  <div key={item.label} style={{ background:`${item.color}10`, borderRadius:10, padding:'10px 12px', border:`1px solid ${item.color}20` }}>
                    <p style={{ fontSize:10, color:D.muted, margin:'0 0 3px', textTransform:'uppercase', fontWeight:700 }}>{item.label}</p>
                    <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:13, color:item.color, margin:0 }}>{item.val}</p>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label style={labelStyle}>Nòt (opsyonèl)</label>
              <textarea className="ke-input" style={{ ...inputStyle, height:52, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Obsèvasyon jounen an..."/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="ke-btn" onClick={onClose} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
              <button className="ke-btn" onClick={() => setEtap(2)}
                style={{ flex:2, padding:'13px', borderRadius:12, border:'none', cursor:'pointer', background:`linear-gradient(135deg,${D.orange},${D.orange}bb)`, color:'#fff', fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <FileText size={15}/> Kontinye → Konfimasyon
              </button>
            </div>
          </>
        )}
        {etap === 2 && !rapo && (
          <>
            <div style={{ background:`${D.red}10`, border:`1px solid ${D.red}30`, borderRadius:10, padding:'10px 14px' }}>
              <p style={{ fontSize:12, color:D.red, margin:0, fontWeight:700 }}>🔒 Etap final — Aksyon sa a <strong>p ap ka defèt</strong>.</p>
            </div>
            <div>
              <label style={labelStyle}>Nèt Sistèm (Kalkile Otomatikman)</label>
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'12px 14px', border:`1px solid ${D.cardBorder}`, fontSize:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ color:D.muted }}>Lajan Rantre:</span>
                  <span style={{ color:D.green, fontFamily:'monospace', fontWeight:700 }}>+{fmt(totalCashIn)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ color:D.muted }}>Lajan Soti:</span>
                  <span style={{ color:D.red, fontFamily:'monospace', fontWeight:700 }}>−{fmt(totalCashOut)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', borderTop:`1px solid ${D.cardBorder}`, paddingTop:8 }}>
                  <span style={{ fontWeight:800, color:D.text }}>Nèt Sistèm:</span>
                  <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:15, color:D.gold }}>{fmt(netSystem)} HTG</span>
                </div>
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, color:D.blue }}>Montan Fizik nan Kès (HTG) *</label>
              <input type="number" min="0" step="0.01" className="ke-input"
                style={{ ...inputStyle, fontSize:24, fontWeight:800, textAlign:'center', color:D.blue, borderColor:`${D.blue}50` }}
                value={montantFizik} onChange={e => setMontantFizik(e.target.value)} placeholder="0.00" onFocus={e => e.target.select()} autoFocus/>
            </div>
            {hasMontant && (
              <div style={{ background:`${difColor}12`, borderRadius:10, padding:'12px 14px', border:`1px solid ${difColor}35` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:800, color:difColor }}>Diferans:</span>
                  <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:18, color:difColor }}>{diferans>=0?'+':''}{fmt(diferans)} HTG</span>
                </div>
                <p style={{ fontSize:11, color:D.muted, margin:'3px 0 0' }}>{difLabel}</p>
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button className="ke-btn" onClick={() => setEtap(1)} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>← Retou</button>
              <button className="ke-btn" onClick={handleFemen} disabled={loading||!hasMontant}
                style={{ flex:2, padding:'13px', borderRadius:12, border:'none', cursor:loading||!hasMontant?'not-allowed':'pointer', background:'linear-gradient(135deg,#dc2626,#a00)', color:'#fff', fontWeight:800, fontSize:14, opacity:loading||!hasMontant?0.6:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                {loading ? <><Spinner/> Ap fèmen...</> : <><Lock size={15}/> Fèmen Kès Definitiv</>}
              </button>
            </div>
          </>
        )}
        {rapo && (
          <>
            <div style={{ background:D.greenBg, border:`1px solid ${D.green}30`, borderRadius:12, padding:'14px', textAlign:'center' }}>
              <CheckCircle size={28} style={{ color:D.green, margin:'0 auto 8px', display:'block' }}/>
              <p style={{ fontSize:15, fontWeight:800, color:D.green, margin:'0 0 4px' }}>Kès Fèmen ✅</p>
            </div>
            <button className="ke-btn" onClick={onClose} style={{ padding:'13px', borderRadius:12, border:'none', background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:14, cursor:'pointer' }}>Fèmen</button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY PRÈ — ✅ Admin delete prè + peman
// ═══════════════════════════════════════════════════════════════
export function ModalDetailPre({ preId, onClose, onPaieman, printer }) {
  const { tenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdminUser = user?.role === 'admin'

  const { data: preData, isLoading } = useQuery({
    queryKey: ['pre-one', preId],
    queryFn:  () => preAPI.getOne(preId).then(r => r.data),
    enabled:  !!preId,
  })

  // ✅ Admin: efase prè
  const mutDeletePre = useMutation({
    mutationFn: () => preAPI.deletePre(preId),
    onSuccess: () => {
      toast.success('✅ Prè efase avèk siksè.')
      qc.invalidateQueries(['pre-list'])
      qc.invalidateQueries(['pre-stats'])
      onClose()
    },
    onError: e => toast.error(e.response?.data?.message || 'Erè efase prè.'),
  })

  const mutCloture = useMutation({
    mutationFn: () => preAPI.cloture(preId),
    onSuccess: () => { toast.success('Prè klotire ✅'); qc.invalidateQueries(['pre-list']); qc.invalidateQueries(['pre-one', preId]); onClose() },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erè klotire.'),
  })

  if (isLoading || !preData?.pre) return (
    <Modal onClose={onClose} title="Detay Prè" width={600}>
      <div style={{ textAlign: 'center', padding: 40, color: D.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Spinner color={D.gold} size={18}/> Ap chaje...
      </div>
    </Modal>
  )

  const pre          = preData.pre
  const resteAPayer  = Math.max(0, Number(pre.totalDu||0) - Number(pre.totalPaye||0))
  const pctPaye      = pre.totalDu > 0 ? Math.min((Number(pre.totalPaye)/Number(pre.totalDu))*100, 100) : 0
  const interetKouru = Number(pre.interetKouruTotal || 0)

  const handlePrintKontra = async () => {
    try { const r = await preAPI.echeances(preId); printer.printPre({ pre, echeances: r.data.echeances||[], tenant, type: 'ouverture' }) }
    catch { printer.printPre({ pre, echeances: [], tenant, type: 'ouverture' }) }
  }

  // ✅ Admin: efase peman
  const handleDeletePaiement = (px) => {
    if (!window.confirm(`Efase peman ${Number(px.montant).toLocaleString()} HTG?\n⚠️ IREVERSIB — total_paye ap korije otomatikman.`)) return
    preAPI.deletePaiement(pre.id, px.id)
      .then(() => { toast.success('✅ Peman efase!'); qc.invalidateQueries(['pre-one', pre.id]); qc.invalidateQueries(['pre-list']); qc.invalidateQueries(['pre-stats']) })
      .catch(err => toast.error(err.response?.data?.message || 'Erè efase peman.'))
  }

  return (
    <Modal onClose={onClose} title={`📋 ${pre.numeroPre}`} width={600}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Bannè */}
        <div style={{ background: D.goldBtn, borderRadius: 14, padding: '14px 16px', color: '#0a1222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 3px' }}>{pre.clientNom}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{pre.numeroPre}</p>
            {pre.clientPhone  && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>📱 {pre.clientPhone}</p>}
            {pre.garantiByens && <p style={{ fontSize: 10, opacity: 0.8,  margin: '2px 0 0' }}>🏠 {pre.garantiByens}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatutBadge statut={pre.statut}/>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, margin: '6px 0 0' }}>{fmt(pre.montant)} HTG</p>
            <p style={{ fontSize: 10, opacity: 0.6, margin: '1px 0 0' }}>{pre.tauxInteret}% / mwa • {pre.dureeEnMois} mwa • {PERIODES.find(p=>p.value===pre.periode)?.label}</p>
          </div>
        </div>

        {/* Avalize */}
        {(pre.avalize1Nom || pre.avalize2Nom) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ nom: pre.avalize1Nom, tel: pre.avalize1Phone, label: 'Avalize 1' }, { nom: pre.avalize2Nom, tel: pre.avalize2Phone, label: 'Avalize 2' }]
              .filter(a => a.nom).map(a => (
              <div key={a.label} style={{ flex: 1, padding: '8px 12px', background: `${D.blue}10`, borderRadius: 10, border: `1px solid ${D.blue}20`, minWidth: 140 }}>
                <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>{a.label}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: D.blue, margin: 0 }}>{a.nom}</p>
                {a.tel && <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 0' }}>{a.tel}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Barre pwogresyon */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted, marginBottom: 5 }}>
            <span style={{ color: D.green }}>Peye: {fmt(pre.totalPaye||0)} HTG</span>
            <span style={{ fontWeight: 700, color: D.text }}>{Math.round(pctPaye)}%</span>
            <span style={{ color: interetKouru > 0 ? D.red : D.muted }}>Rete: {fmt(resteAPayer+interetKouru)} HTG</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${pctPaye}%`, background: pctPaye>=100 ? D.gold : D.green, transition: 'width 0.4s' }}/>
          </div>
        </div>

        {/* Griy detay */}
        <div className="pre-detail-grid">
          {[
            { label:'Kapital',    val:`${fmt(pre.montant)} HTG`,      color:D.gold   },
            { label:'To Enterè', val:`${pre.tauxInteret}% / mwa`,   color:D.orange },
            { label:'Dire',       val:`${pre.dureeEnMois} mwa`,      color:D.blue   },
            { label:'Total Dwe',  val:`${fmt(pre.totalDu)} HTG`,     color:D.red    },
            { label:'Total Peye', val:`${fmt(pre.totalPaye||0)} HTG`, color:D.green },
            { label:'Int. Kouru', val:`${fmt(interetKouru)} HTG`,    color:interetKouru>0?D.red:D.muted },
          ].map(item => (
            <div key={item.label} style={{ background:`${item.color}0f`, borderRadius:10, padding:'10px 12px', border:`1px solid ${item.color}20` }}>
              <p style={{ fontSize:10, color:D.muted, margin:'0 0 3px', textTransform:'uppercase', fontWeight:700 }}>{item.label}</p>
              <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:13, color:item.color, margin:0 }}>{item.val}</p>
            </div>
          ))}
        </div>

        {pre.notes && (
          <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'10px 12px', border:`1px solid ${D.cardBorder}` }}>
            <p style={{ fontSize:10, color:D.muted, margin:'0 0 4px', fontWeight:700, textTransform:'uppercase' }}>Nòt</p>
            <p style={{ fontSize:13, color:D.text, margin:0 }}>{pre.notes}</p>
          </div>
        )}

        {/* Boutons aksyon */}
        {pre.statut !== 'cloture' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ke-btn" onClick={onPaieman}
              style={{ flex:2, padding:'11px', borderRadius:10, border:`1px solid ${D.green}30`, background:D.greenBg, color:D.green, fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <ArrowDownCircle size={14}/> Anrejistre Peman
            </button>
            <button className="ke-btn" onClick={handlePrintKontra}
              style={{ padding:'11px 14px', borderRadius:10, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
              <Printer size={13}/> Kontra
            </button>
            {resteAPayer <= 0.01 && interetKouru <= 0 && (
              <button className="ke-btn" onClick={() => mutCloture.mutate()} disabled={mutCloture.isPending}
                style={{ padding:'11px 14px', borderRadius:10, border:`1px solid ${D.gold}30`, background:D.goldDim, color:D.gold, cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                {mutCloture.isPending ? <Spinner size={12} color={D.gold}/> : <CheckCircle size={13}/>} Klotire
              </button>
            )}
          </div>
        )}

        {/* ✅ Admin — Efase Prè */}
        {isAdminUser && (
          <div style={{ borderTop:`1px solid ${D.red}25`, paddingTop:10, marginTop:2 }}>
            <p style={{ fontSize:10, fontWeight:700, color:D.red, textTransform:'uppercase', margin:'0 0 8px', letterSpacing:'0.06em' }}>⚠️ Zone Admin — Aksyon Ireversib</p>
            <button className="ke-btn" onClick={() => {
              if (window.confirm(`Efase prè ${pre.numeroPre} — ${pre.clientNom}?\n⚠️ IREVERSIB — tout peman ak echeances ap efase.`))
                mutDeletePre.mutate()
            }} disabled={mutDeletePre.isPending}
              style={{ width:'100%', padding:'10px', borderRadius:10, border:`1px solid ${D.red}40`, background:D.redBg, color:D.red, cursor:'pointer', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              {mutDeletePre.isPending ? <Spinner size={13} color={D.red}/> : <Trash2 size={14}/>}
              {mutDeletePre.isPending ? 'Ap efase...' : `Efase Prè ${pre.numeroPre}`}
            </button>
          </div>
        )}

        {/* Kalandriye */}
        <KalandriyeSection preId={preId}/>

        {/* Istwa Peman */}
        <div>
          <p style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', color:D.muted, margin:'0 0 8px', letterSpacing:'0.06em' }}>
            Istwa Peman ({pre.paiements?.length || 0})
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:220, overflowY:'auto' }}>
            {!pre.paiements?.length
              ? <p style={{ textAlign:'center', color:D.muted, fontSize:12, padding:20 }}>Pa gen peman toujou</p>
              : pre.paiements.map(px => (
                <div key={px.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 11px', borderRadius:10, background:D.greenBg, border:`1px solid ${D.green}20` }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:`${D.green}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ArrowDownCircle size={13} style={{ color:D.green }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:D.green }}>Peman</span>
                      <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:12, color:D.green }}>+{fmt(px.montant)} HTG</span>
                    </div>
                    <p style={{ fontSize:10, color:D.muted, margin:'2px 0 0' }}>
                      {fmtDate(px.createdAt)} • {px.method}{px.reference ? ` • ${px.reference}` : ''}
                    </p>
                  </div>
                  {/* Enprime */}
                  <button className="ke-btn" onClick={() => printer.printPre({ pre:{ ...pre, totalPaye:Number(px.balanceAvant||0) }, paiement:px, tenant, type:'paiement' })}
                    style={{ width:26, height:26, borderRadius:6, border:'none', background:'rgba(255,255,255,0.05)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Printer size={11}/>
                  </button>
                  {/* ✅ Admin: Efase peman */}
                  {isAdminUser && (
                    <button className="ke-btn" title="Admin: Efase peman" onClick={() => handleDeletePaiement(px)}
                      style={{ width:26, height:26, borderRadius:6, border:'none', background:'rgba(251,113,133,0.12)', color:'#FB7185', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Trash2 size={11}/>
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}