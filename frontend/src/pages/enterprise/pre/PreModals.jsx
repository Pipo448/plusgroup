// src/pages/enterprise/pre/PreModals.jsx
// ═══════════════════════════════════════════════════════════════
// PRÈ — Modal yo: Kreye, Peman, Kapital, Fèmen Kès, Detay, Resi
// (design "Plus Fit" — menm baz ak Kanè Epay)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import {
  Printer, CheckCircle, Clock, Lock, ArrowDownCircle, ArrowRight, Trash2, XCircle,
  PiggyBank, FileText, Coins, Landmark, BarChart3, TrendingDown, Ruler, Sun, Check,
  Share2, Image as ImageIcon, FileDown, Receipt, ClipboardCheck, AlertTriangle, Phone,
  Home, Pencil, Wallet, Users,
} from 'lucide-react'
import { fmt, fmtDate } from '../kane-epay/kaneEpayUtils'
import { T, hexA } from '../kane-epay/kaneEpayConstants'
import { PERIODES, TIP_KALKIL } from './preConstants'
import { preAPI } from './preAPI'
import { calcPreviewEcheances, calcNbrPeman } from './preCalc'
import { usePreShare } from './preUtils'
import {
  Spinner, Modal, Section, Field, AmountField, MethodPicker, Alert, Chip, AnimatedNumber,
  StatutBadge, KalandriyeSection, KaneEpaySearch, AvalizelSection, PreReceiptPreview, NameAvatar,
} from './PreComponents'
import PinConfirmModal from '../../../components/PinConfirmModal'

const TIP_ICONS = { flat: BarChart3, declining: TrendingDown, constant: Ruler, bous_soleil: Sun }
const periodLabel = (p) => PERIODES.find(x => x.value === p)?.label || p

// Ekran "kès fèmen" pou modal ki pa ka travay
function KesFemenModal({ onClose, title, text }) {
  return (
    <Modal onClose={onClose} title={title} icon={<Lock size={20} />} accent={T.redD} width={440} dismissible
      footer={<button className="ke-fbtn main dark" onClick={onClose}>Konprann</button>}>
      <div className="ke-success">
        <div className="ke-check" style={{ boxShadow: '0 0 0 10px rgba(220,38,38,.1)' }}><Lock size={38} color={T.redD} /></div>
        <h3>Kès fèmen</h3>
        <p>{text}</p>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE PRÈ
// ═══════════════════════════════════════════════════════════════
export function ModalCreePre({ onClose, onSuccess, printer, kesFemen }) {
  const [kaneKont, setKaneKont] = useState(null)
  const [form, setForm] = useState({
    montant: '', tauxInteret: '', dureeEnMois: '6',
    datDebut: new Date().toISOString().split('T')[0],
    periode: 'mois', montantBloke: '', tipKalkil: 'declining',
    pemaParJou: '', nombreJou: '', method: 'cash', reference: '', notes: '',
    garantiByens: '', avalize1Nom: '', avalize1Phone: '', avalize2Nom: '', avalize2Phone: '',
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: undefined })) }

  const isBousSoleil = form.tipKalkil === 'bous_soleil'
  const kapital  = Number(form.montant || 0)
  const nbrPeman = isBousSoleil ? Number(form.nombreJou || 0) : calcNbrPeman(Number(form.dureeEnMois || 1), form.periode)

  let preview = { pmtMwayèn:0, pmt:0, premyePeman:0, dènyePeman:0, totalDu:0, totalInteret:0 }
  if (isBousSoleil) {
    const pjou = Number(form.pemaParJou || 0), njou = Number(form.nombreJou || 0)
    if (kapital > 0 && pjou > 0 && njou > 0) {
      const totalDu = Math.round(pjou * njou * 100) / 100
      preview = { pmtMwayèn: pjou, pmt: pjou, premyePeman: pjou, dènyePeman: pjou, totalDu, totalInteret: Math.round((totalDu - kapital) * 100) / 100 }
    }
  } else {
    preview = calcPreviewEcheances(kapital, Number(form.tauxInteret || 0), nbrPeman, form.periode, form.tipKalkil)
  }
  const { pmtMwayèn, premyePeman, dènyePeman, totalDu, totalInteret } = preview

  const mutation = useMutation({
    mutationFn: (d) => preAPI.create(d),
    onSuccess: (res) => {
      toast.success(`Demand prè ${res.data.pre.numeroPre} voye pou apwobasyon!`)
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè kreyasyon prè.'),
  })

  if (kesFemen) return <KesFemenModal onClose={onClose} title="Nouvo prè" text="Ou pa ka kreye nouvo prè jodi a. Kès la ap louvri demen." />

  const validate = () => {
    const e = {}
    if (!kaneKont) e.kane = 'Chwazi yon kont Kanè Epay — li obligatwa'
    if (isBousSoleil) {
      if (kapital <= 0) e.montant = 'Kapital dwe pi gran pase 0'
      if (!form.pemaParJou || Number(form.pemaParJou) <= 0) e.pemaParJou = 'Peman pa jou obligatwa'
      if (!form.nombreJou  || Number(form.nombreJou)  <= 0) e.nombreJou  = 'Kantite jou obligatwa'
      if (!e.pemaParJou && Number(form.pemaParJou) * Number(form.nombreJou) <= kapital) e.pemaParJou = 'Total peman yo dwe plis pase kapital la'
    } else {
      if (kapital <= 0)      e.montant     = 'Montan dwe pi gran pase 0'
      if (!form.tauxInteret) e.tauxInteret = 'To enterè obligatwa'
      if (!form.dureeEnMois) e.dureeEnMois = 'Dire obligatwa'
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

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main gold" onClick={handleSubmit} disabled={mutation.isPending}>
        {mutation.isPending ? <><Spinner /> Ap voye...</> : <><FileText size={17} /> Voye pou apwobasyon</>}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Nouvo prè" subtitle="Demand la ap tann apwobasyon yon admin" icon={<Coins size={20} />} width={640} footer={footer}>
      <Section n={1} title="Kont Kanè Epay" delay={0.04}>
        <KaneEpaySearch selected={kaneKont} onSelect={(a) => { setKaneKont(a); setErrors(e => ({ ...e, kane: undefined })) }} onClear={() => setKaneKont(null)} error={errors.kane} />
      </Section>

      <Section n={2} title="Tip kalkil enterè" delay={0.08}>
        <div className="pre-tips">
          {TIP_KALKIL.map(tip => {
            const Ic = TIP_ICONS[tip.value] || BarChart3
            const on = form.tipKalkil === tip.value
            return (
              <button key={tip.value} type="button" className={`pre-tip${on ? ' on' : ''}`} onClick={() => set('tipKalkil', tip.value)}
                style={{ '--c': tip.color, '--cbg': hexA(tip.color, .1) }}>
                <span className="ic"><Ic size={19} /></span>
                <span><p className="t">{tip.label}</p><p className="d">{tip.desc}</p></span>
                {on && <span className="ck"><Check size={13} strokeWidth={3} /></span>}
              </button>
            )
          })}
        </div>
      </Section>

      <Section n={3} title="Tèm finansye" delay={0.12}>
        <AmountField label="Kapital (montan prè a) *" value={form.montant} onChange={v => set('montant', v)} accent={T.gold}
          quick={[5000, 10000, 25000, 50000]} error={errors.montant} />

        {isBousSoleil ? (
          <div className="ke-two ke-mt">
            <Field label="Peman pa jou (HTG) *" error={errors.pemaParJou}>
              <input type="number" min="1" step="0.01" inputMode="decimal" className={`ke-input${errors.pemaParJou ? ' err' : ''}`} value={form.pemaParJou} onChange={e => set('pemaParJou', e.target.value)} placeholder="200" />
            </Field>
            <Field label="Kantite jou *" error={errors.nombreJou}>
              <input type="number" min="1" max="365" inputMode="numeric" className={`ke-input${errors.nombreJou ? ' err' : ''}`} value={form.nombreJou} onChange={e => set('nombreJou', e.target.value)} placeholder="30" />
            </Field>
          </div>
        ) : (
          <div className="ke-two ke-mt">
            <Field label="To enterè (% / mwa) *" error={errors.tauxInteret}>
              <input type="number" min="0" max="100" step="0.1" inputMode="decimal" className={`ke-input${errors.tauxInteret ? ' err' : ''}`} value={form.tauxInteret} onChange={e => set('tauxInteret', e.target.value)} placeholder="egz: 3" />
            </Field>
            <Field label="Dire (mwa) *" error={errors.dureeEnMois}>
              <input type="number" min="1" max="120" inputMode="numeric" className={`ke-input${errors.dureeEnMois ? ' err' : ''}`} value={form.dureeEnMois} onChange={e => set('dureeEnMois', e.target.value)} />
            </Field>
          </div>
        )}

        {totalDu > 0 && (
          <div className="ke-summary">
            <div className="line"><span>Kapital</span><b>{fmt(kapital)} HTG</b></div>
            <div className="line"><span>Enterè total</span><b style={{ color: T.orange }}>+ {fmt(totalInteret)} HTG</b></div>
            <div className="line"><span>{isBousSoleil ? 'Peman pa jou' : form.tipKalkil === 'constant' ? 'Premye → dènye peman' : 'Chak peman'}</span>
              <b>{form.tipKalkil === 'constant' && !isBousSoleil ? `${fmt(premyePeman)} → ${fmt(dènyePeman)}` : fmt(pmtMwayèn)} <span style={{ color: T.muted }}>× {nbrPeman}</span></b>
            </div>
            <div className="total"><span>Total pou remèt</span><b><AnimatedNumber value={totalDu} duration={500} /> <small style={{ fontSize: 14, color: T.muted }}>HTG</small></b></div>
          </div>
        )}

        {!isBousSoleil && (
          <div className="ke-two-r ke-mt">
            <Field label="Garanti / byen (opsyonèl)">
              <input className="ke-input" value={form.garantiByens} onChange={e => set('garantiByens', e.target.value)} placeholder="Kay, motosiklèt, tè..." />
            </Field>
            <Field label="Depozit bloke (opsyonèl)">
              <input type="number" min="0" step="0.01" inputMode="decimal" className="ke-input" value={form.montantBloke} onChange={e => set('montantBloke', e.target.value)} placeholder="0,00" />
            </Field>
          </div>
        )}
      </Section>

      <Section n={4} title="Kalandriye" delay={0.16}>
        <Field label="Dat premye peman">
          <input type="date" className="ke-input" value={form.datDebut} onChange={e => set('datDebut', e.target.value)} />
        </Field>
        {!isBousSoleil && (
          <div className="ke-mt">
            <label className="ke-label">Frekans peman</label>
            <div className="pre-pills">
              {PERIODES.map(p => (
                <button key={p.value} type="button" className={form.periode === p.value ? 'on' : ''} onClick={() => set('periode', p.value)}>{p.label}</button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <AvalizelSection n={5} form={form} set={set} />

      <Section n={6} title="Dekèsman" delay={0.24}>
        <MethodPicker value={form.method} onChange={v => set('method', v)} />
        <div className="ke-two-r ke-mt">
          <Field label="Referans"><input className="ke-input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Egz: MonCash #..." /></Field>
          <div>
            <label className="ke-label">Tay papye resi</label>
            <div className="pre-pills">
              {[57, 80].map(mm => <button key={mm} type="button" className={printer.largeur === mm ? 'on' : ''} onClick={() => printer.setLargeur(mm)}>{mm} mm</button>)}
            </div>
          </div>
        </div>
        <div className="ke-mt">
          <Field label="Nòt"><textarea className="ke-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Rezon prè a, lòt enfòmasyon..." /></Field>
        </div>
      </Section>
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
  const apre        = Math.max(0, resteAPayer - amt)

  const mutation = useMutation({
    mutationFn: (d) => preAPI.paiement(pre.id, d),
    onSuccess: async (res) => {
      toast.success(`Peman ${fmt(amt)} HTG anrejistre!`)
      qc.invalidateQueries({ queryKey: ['pre-echeances', pre.id] })
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

  if (kesFemen) return <KesFemenModal onClose={onClose} title={`Peman — ${pre.numeroPre}`} text="Ou pa ka anrejistre peman apre kès la fèmen." />

  const submit = () => { if (!mutation.isPending && amt > 0) mutation.mutate({ montant: amt, method: form.method, reference: form.reference||undefined }) }
  const quick = [{ l: 'Tout', v: resteAPayer }, { l: '½', v: resteAPayer / 2 }, { l: '¼', v: resteAPayer / 4 }].filter(q => q.v > 0)

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main green" onClick={submit} disabled={mutation.isPending || amt <= 0}>
        {mutation.isPending ? <><Spinner /> Ap anrejistre...</> : <><ArrowDownCircle size={18} /> {amt > 0 ? `Konfime ${fmt(amt)} G` : 'Konfime peman'}</>}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Peman prè" subtitle={`${pre.numeroPre} · ${pre.clientNom}`} icon={<ArrowDownCircle size={20} />} accent={T.greenD} width={480} footer={footer}>
      <div className="ke-col">
        <div className="ke-mini">
          <NameAvatar nom={pre.clientNom} size={46} radius={15} />
          <div style={{ minWidth: 0 }}>
            <p className="ke-acc-no">{pre.numeroPre}</p>
            <p className="ke-acc-name">{pre.clientNom}</p>
          </div>
          <div className="r"><p className="ke-label-s">Kapital</p><p className="v">{fmt(pre.montant)}</p></div>
        </div>
        <div className="ke-two">
          <div className="ke-mtile" style={{ '--c': T.green, '--cbg': hexA(T.green, .07) }}><p className="ke-label-s">Deja peye</p><p className="v">{fmt(pre.totalPaye || 0)}</p></div>
          <div className="ke-mtile" style={{ '--c': T.red, '--cbg': hexA(T.red, .07) }}><p className="ke-label-s">Rete pou peye</p><p className="v">{fmt(resteAPayer)}</p></div>
        </div>
        <div>
          <AmountField label="Montan peman *" value={form.montant} onChange={v => setForm(p => ({ ...p, montant: v }))} accent={T.greenD} autoFocus onEnter={submit} />
          {quick.length > 0 && (
            <div className="pre-quick">
              {quick.map(q => (
                <button key={q.l} type="button" className={Math.abs(amt - q.v) < 0.01 ? 'on' : ''} onClick={() => setForm(p => ({ ...p, montant: q.v.toFixed(2) }))}>
                  {q.l}<small>{fmt(q.v)}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        {amt > 0 && (
          <div className="ke-preview" style={{ '--cbg': hexA(T.green, .06), '--cbd': hexA(T.green, .25) }}>
            <div><p className="ke-label-s">Rete kounye a</p><p className="v" style={{ color: T.muted }}>{fmt(resteAPayer)}</p></div>
            <div className="arrow"><ArrowRight size={16} /></div>
            <div style={{ textAlign: 'right' }}>
              <p className="ke-label-s">Rete apre peman</p>
              <p className="v" style={{ color: apre <= 0 ? T.goldInk : T.green }}>{apre <= 0 ? 'KONPLÈ' : <AnimatedNumber value={apre} duration={450} />}</p>
            </div>
          </div>
        )}
        <div>
          <label className="ke-label">Metòd peman</label>
          <MethodPicker value={form.method} onChange={v => setForm(p => ({ ...p, method: v }))} />
        </div>
        <Field label="Referans (opsyonèl)">
          <input className="ke-input" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="Egz: MonCash #..." />
        </Field>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: ENJEKTE KAPITAL — korije nan 5 minit
// ═══════════════════════════════════════════════════════════════
export function ModalKapital({ onClose, onSuccess }) {
  const [form, setForm]         = useState({ montant: '', notes: '' })
  const [phase, setPhase]       = useState('create')
  const [lastId, setLastId]     = useState(null)
  const [sekon, setSekon]       = useState(0)
  const [savedAmt, setSavedAmt] = useState(0)
  const amt = Number(form.montant || 0)
  const VIOLET = '#a78bfa'

  useEffect(() => {
    if (sekon <= 0 || phase !== 'edit') return
    const t = setInterval(() => setSekon(s => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [sekon > 0, phase])   // eslint-disable-line react-hooks/exhaustive-deps

  const fmtTimer   = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const timerColor = sekon > 120 ? T.greenD : sekon > 30 ? T.gold : T.redD

  const mutation = useMutation({
    mutationFn: (d) => preAPI.enjekteKapital(d),
    onSuccess: (res) => {
      toast.success(`${fmt(amt)} HTG enjekte!`)
      onSuccess(); setSavedAmt(amt)
      if (res.data?.id) { setLastId(res.data.id); setSekon(300); setPhase('edit'); setForm({ montant: '', notes: '' }) }
      else onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè enjeksyon.'),
  })
  const mutEdit = useMutation({
    mutationFn: (d) => preAPI.updateKapital(lastId, d),
    onSuccess: () => { toast.success(`Enjeksyon korije — ${fmt(amt || savedAmt)} HTG!`); onSuccess(); onClose() },
    onError: (e) => { toast.error(e.response?.data?.message || 'Erè modifikasyon.'); if (e.response?.data?.expired) onClose() },
  })

  const footer = phase === 'create' ? (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main dark" onClick={() => mutation.mutate({ montant: amt, notes: form.notes||undefined })} disabled={mutation.isPending || amt <= 0}>
        {mutation.isPending ? <><Spinner /> Ap enjekte...</> : <><PiggyBank size={18} /> Konfime enjeksyon</>}
      </button>
    </>
  ) : sekon > 0 ? (
    <>
      <button className="ke-fbtn" onClick={onClose}>Pa korije</button>
      <button className="ke-fbtn main orange" onClick={() => mutEdit.mutate({ montant: amt || savedAmt, notes: form.notes||undefined })} disabled={mutEdit.isPending}>
        {mutEdit.isPending ? <><Spinner /> Ap korije...</> : <><Pencil size={17} /> Korije montan</>}
      </button>
    </>
  ) : <button className="ke-fbtn main dark" onClick={onClose}>Fèmen</button>

  return (
    <Modal onClose={onClose} title={phase === 'edit' ? 'Korije enjeksyon' : 'Enjekte kapital'} subtitle="Lajan disponib pou prète kliyan"
      icon={phase === 'edit' ? <Pencil size={19} /> : <PiggyBank size={20} />} accent={VIOLET} width={460} footer={footer}>
      <div className="ke-col">
        {phase === 'create' ? (
          <>
            <Alert color={T.violet} icon={<PiggyBank size={17} />}>Kesye yo ap ka prète lajan sa a bay kliyan. <b>Ou gen 5 minit pou korije si gen erè.</b></Alert>
            <AmountField label="Montan pou enjekte *" value={form.montant} onChange={v => setForm(p => ({ ...p, montant: v }))} accent={VIOLET} autoFocus quick={[10000, 25000, 50000, 100000]} />
            <Field label="Nòt (opsyonèl)"><input className="ke-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Sous lajan an, rezon..." /></Field>
          </>
        ) : (
          <>
            <div className="ke-success" style={{ padding: 0 }}>
              <div className="ke-check" style={{ width: 80, height: 80 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </div>
              <h3 style={{ fontSize: 28 }}>{fmt(savedAmt)} HTG enjekte</h3>
            </div>
            <div className="pre-timer" style={{ '--c': timerColor }}>
              <div>
                <span className="ke-eyebrow"><Clock size={13} /> {sekon > 0 ? 'Tan pou korije' : 'Tan an fini'}</span>
                <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'rgba(242,241,236,.6)', fontWeight: 600 }}>{sekon > 0 ? 'Chanje montan an anba a si te gen erè.' : 'Limit 5 minit lan depase — ou pa ka korije ankò.'}</p>
              </div>
              <span className="v">{fmtTimer(sekon)}</span>
            </div>
            {sekon > 0 && (
              <>
                <AmountField label="Nouvo montan" value={form.montant} onChange={v => setForm(p => ({ ...p, montant: v }))} accent={T.gold} autoFocus />
                <Field label="Nòt (opsyonèl)"><input className="ke-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ajoute yon nòt si bezwen..." /></Field>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: FÈMEN KÈS
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
  const hasMontant   = montantFizik !== '' && montFizikNum >= 0
  const exact        = Math.abs(diferans) < 0.01
  const difColor = exact ? '#4ade80' : diferans > 0 ? T.gold : '#ff7b7b'
  const difLabel = exact ? 'Kès la egal ak sistèm nan' : diferans > 0 ? `${fmt(diferans)} HTG anplis nan kès la` : `${fmt(Math.abs(diferans))} HTG ki manke`

  const handleFemen = async () => {
    if (!hasMontant) return
    setLoading(true)
    try {
      const notesFinale = [notes||'', `Montan fizik: ${fmt(montFizikNum)} HTG`, `Nèt sistèm: ${fmt(netSystem)} HTG`, `Diferans: ${diferans>=0?'+':''}${fmt(diferans)} HTG`].filter(Boolean).join(' | ')
      const res = await preAPI.femenKes({ notes: notesFinale })
      setRapo(res.data.rapo || { ok: true })
      toast.success('Kès fèmen!')
      qc.invalidateQueries({ queryKey: ['kes-status'] })
      onKesFemen()
    } catch (e) { toast.error(e.response?.data?.message || 'Erè fèmen kès.') }
    finally { setLoading(false) }
  }

  const Summary = () => (
    <div className="ke-summary" style={{ marginTop: 0 }}>
      <div className="line"><span>Lajan ki rantre</span><b style={{ color: T.green }}>+{fmt(totalCashIn)}</b></div>
      <div className="line"><span>Lajan ki soti</span><b style={{ color: T.red }}>−{fmt(totalCashOut)}</b></div>
      <div className="total"><span>Nèt sistèm</span><b>{fmt(netSystem)} <small style={{ fontSize: 14, color: T.muted }}>HTG</small></b></div>
    </div>
  )

  const footer = rapo ? <button className="ke-fbtn main dark" onClick={onClose}>Fèmen</button>
    : etap === 1 ? (<><button className="ke-fbtn" onClick={onClose}>Anile</button><button className="ke-fbtn main dark" onClick={() => setEtap(2)}>Kontinye <ArrowRight size={17} /></button></>)
    : (<><button className="ke-fbtn" onClick={() => setEtap(1)}>← Retou</button>
        <button className="ke-fbtn main danger" onClick={handleFemen} disabled={loading || !hasMontant}>{loading ? <><Spinner /> Ap fèmen...</> : <><Lock size={17} /> Fèmen kès definitif</>}</button></>)

  return (
    <Modal onClose={onClose} width={560} footer={footer} title="Fèmen kès" subtitle={rapo ? 'Jounen an fini' : 'Rapò jounen an · Kanè + Prè'} icon={<ClipboardCheck size={20} />}>
      {!rapo && (
        <div className="ke-steps">
          <div className={`ke-step ${etap === 1 ? 'on' : 'done'}`}><b>{etap > 1 ? '✓' : '1'}</b>Rezime</div>
          <div className="ke-step-line"><i style={{ width: etap > 1 ? '100%' : '0%' }} /></div>
          <div className={`ke-step ${etap === 2 ? 'on' : ''}`}><b>2</b>Konfimasyon</div>
        </div>
      )}
      {etap === 1 && !rapo && (
        <div className="ke-col">
          <Alert color={T.orange}>Fèmen kès la ap <b>bloke paj Kanè ak Prè</b> jiskaske demen.</Alert>
          <div className="ke-two">
            {[
              { l:'Depo Kanè',     v:fmt(depoJou),  c:T.green  },
              { l:'Retrè Kanè',    v:fmt(retrèJou), c:T.red    },
              { l:'Koleksyon Prè', v:fmt(kolPre),   c:T.teal   },
              { l:'Dekèsman Prè',  v:fmt(desPre),   c:T.orange },
            ].map((t, i) => (
              <div key={t.l} className="ke-mtile" style={{ '--c': t.c, '--cbg': hexA(t.c, .07), animationDelay: `${i * .05}s` }}>
                <p className="ke-label-s">{t.l}</p><p className="v" style={{ fontSize: 22 }}>{t.v}</p>
              </div>
            ))}
          </div>
          <Summary />
          <Field label="Nòt (opsyonèl)"><textarea className="ke-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Obsèvasyon sou jounen an..." /></Field>
        </div>
      )}
      {etap === 2 && !rapo && (
        <div className="ke-col">
          <Alert color={T.red} icon={<Lock size={17} />}>Etap final — aksyon sa a <b>pa ka defèt</b>.</Alert>
          <Summary />
          <AmountField label="Montan fizik ki nan kès la *" value={montantFizik} onChange={setMontantFizik} accent={T.blueD} autoFocus quick={netSystem > 0 ? [Math.round(netSystem * 100) / 100] : []} />
          {hasMontant && (
            <div className="ke-diff" style={{ '--c': difColor }}>
              <div><span className="k">Diferans</span><p className="s">{difLabel}</p></div>
              <span className="v">{diferans >= 0 ? '+' : ''}<AnimatedNumber value={diferans} duration={450} /></span>
            </div>
          )}
        </div>
      )}
      {rapo && (
        <div className="ke-success">
          <div className="ke-check"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
          <h3>Kès fèmen</h3>
          <p>Montan fizik: <b style={{ color: T.ink }}>{fmt(montFizikNum)} HTG</b> · Diferans: <b style={{ color: exact ? T.green : diferans > 0 ? T.orange : T.red }}>{diferans >= 0 ? '+' : ''}{fmt(diferans)} HTG</b></p>
        </div>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: RESI PRÈ — Aperçu + Imaj / PDF + Enprime
// ═══════════════════════════════════════════════════════════════
export function ModalPreReceipt({ data, onClose, printer }) {
  const share = usePreShare()
  const isPay = data.type === 'paiement'
  // ✅ Prepare imaj la depi fenèt la louvri → « Pataje imaj » imedya (pa ekspire)
  useEffect(() => { share.prepare(data, 'png') }, [data]) // eslint-disable-line
  const footer = (
    <>
      <button className="ke-fbtn" style={{ flex: '0 0 52px', padding: 0 }} title="Enprime (termik)" disabled={printer?.printing}
        onClick={() => printer?.printPre({ pre: data.pre, echeances: data.echeances || [], tenant: data.tenant, type: data.type, paiement: data.paiement })}>
        {printer?.printing ? <Spinner /> : <Printer size={18} />}
      </button>
      <button className="ke-fbtn" onClick={() => share.share(data, 'pdf')} disabled={!!share.generating}>
        {share.generating === 'pdf' ? <Spinner /> : <FileDown size={18} />} PDF
      </button>
      <button className="ke-fbtn main dark" onClick={() => share.share(data, 'png')} disabled={!!share.generating}>
        {share.generating === 'png' ? <Spinner /> : <ImageIcon size={18} />} Pataje imaj
      </button>
    </>
  )
  return (
    <Modal onClose={onClose} dismissible width={520} footer={footer} icon={<Receipt size={20} />}
      title={isPay ? 'Resi peman' : 'Kontra prè'} subtitle={`${data.pre.numeroPre} · ${data.pre.clientNom}`}>
      <PreReceiptPreview {...data} />
      <p className="ke-rcpt-note"><Share2 size={14} /> Imaj la parèt dirèkteman nan WhatsApp. PDF la bon pou imèl oswa pou enprime.</p>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY PRÈ — apwobasyon, peman, kalandriye, admin
// ═══════════════════════════════════════════════════════════════
export function ModalDetailPre({ preId, onClose, onPaieman, printer, kesFemen = false }) {
  const { tenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdminUser = user?.role === 'admin'
  const [receipt, setReceipt]   = useState(null)
  const [loadingKontra, setLoadingKontra] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: preData, isLoading } = useQuery({
    queryKey: ['pre-one', preId],
    queryFn:  () => preAPI.getOne(preId).then(r => r.data),
    enabled:  !!preId,
  })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pre-list'] }); qc.invalidateQueries({ queryKey: ['pre-stats'] }); qc.invalidateQueries({ queryKey: ['pre-one', preId] })
  }

  const [showDeletePreConfirm, setShowDeletePreConfirm] = useState(false)
  const mutDeletePre = useMutation({
    mutationFn: (pin) => preAPI.deletePre(preId, pin),
    onSuccess: () => { toast.success('Prè efase.'); qc.invalidateQueries({ queryKey: ['pre-list'] }); qc.invalidateQueries({ queryKey: ['pre-stats'] }); setShowDeletePreConfirm(false); onClose() },
    onError: e => toast.error(e.response?.data?.message || 'Erè efase prè.'),
  })

  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const mutApprove = useMutation({
    mutationFn: (pin) => preAPI.approve(preId, pin),
    onSuccess: () => { toast.success('Prè apwouve epi lajan dekèse!'); invalidate(); setShowApproveConfirm(false) },
    onError: e => toast.error(e.response?.data?.message || 'Erè apwobasyon.'),
  })
  const mutReject = useMutation({
    mutationFn: (reason) => preAPI.reject(preId, reason),
    onSuccess: () => { toast.success('Prè rejte.'); invalidate(); setShowReject(false) },
    onError: e => toast.error(e.response?.data?.message || 'Erè rejè.'),
  })
  const mutCloture = useMutation({
    mutationFn: () => preAPI.cloture(preId),
    onSuccess: () => { toast.success('Prè klotire!'); qc.invalidateQueries({ queryKey: ['pre-list'] }); qc.invalidateQueries({ queryKey: ['pre-one', preId] }); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè klotire.'),
  })

  const [pixDeleteTarget, setPixDeleteTarget] = useState(null)

  if (isLoading || !preData?.pre) return (
    <Modal onClose={onClose} title="Detay prè" subtitle="Ap chaje..." icon={<Landmark size={20} />} width={660} dismissible>
      <div className="ke-col">
        <div className="ke-skel" style={{ height: 220, borderRadius: 24 }} />
        <div className="ke-three">{[0,1,2,3,4,5].map(i => <div key={i} className="ke-skel" style={{ height: 70, borderRadius: 18 }} />)}</div>
        <div className="ke-skel" style={{ height: 50, borderRadius: 15 }} />
      </div>
    </Modal>
  )

  const pre          = preData.pre
  const resteAPayer  = Math.max(0, Number(pre.totalDu||0) - Number(pre.totalPaye||0))
  const pctPaye      = pre.totalDu > 0 ? Math.min((Number(pre.totalPaye)/Number(pre.totalDu))*100, 100) : 0
  const interetKouru = Number(pre.interetKouruTotal || 0)
  const canPay       = !['cloture', 'attente', 'annule'].includes(pre.statut)
  const paiements    = pre.paiements || []

  const fetchEch = async () => { try { const r = await preAPI.echeances(preId); return r.data.echeances || [] } catch { return [] } }
  const handlePrintKontra = async () => printer.printPre({ pre, echeances: await fetchEch(), tenant, type: 'ouverture' })
  const handleShareKontra = async () => { setLoadingKontra(true); const echeances = await fetchEch(); setLoadingKontra(false); setReceipt({ pre, tenant, type: 'ouverture', echeances }) }

  const confirmDeletePaiement = async (pin) => {
    try {
      await preAPI.deletePaiement(pre.id, pixDeleteTarget.id, pin)
      toast.success('Peman efase!')
      invalidate(); setPixDeleteTarget(null)
    } catch (e) { toast.error(e.response?.data?.message || 'Erè efase peman.'); throw e }
  }

  const tiles = [
    { l:'Kapital',    v:fmt(pre.montant),        c:T.goldInk },
    { l:'To enterè',  v:`${pre.tauxInteret}%`,   c:T.orange },
    { l:'Dire',       v:`${pre.dureeEnMois} mwa`, c:T.blue },
    { l:'Total dwe',  v:fmt(pre.totalDu),        c:T.red },
    { l:'Total peye', v:fmt(pre.totalPaye || 0), c:T.green },
    { l:'Int. kouru', v:fmt(interetKouru),       c:interetKouru > 0 ? T.red : T.muted },
  ]

  return (
    <>
      <Modal onClose={onClose} title={pre.clientNom} subtitle={`Prè ${pre.numeroPre}`} icon={<Landmark size={20} />} width={660}
        dismissible={!showDeletePreConfirm && !showApproveConfirm && !pixDeleteTarget && !receipt}>
        <div className="ke-col">
          {/* Kat prensipal */}
          <div className="ke-pass">
            <div className="ke-pass-top">
              <div className="ke-pass-ph">{(pre.clientNom || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="ke-pass-name">{pre.clientNom}</p>
                <p className="ke-pass-no">{pre.numeroPre}</p>
              </div>
              <StatutBadge statut={pre.statut} />
            </div>
            <div className="ke-pass-bal">
              <div>
                <span className="ke-eyebrow"><Wallet size={13} /> Kapital prè</span>
                <p className="v"><AnimatedNumber value={pre.montant} /><small>HTG</small></p>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'rgba(242,241,236,.65)', marginBottom: 8 }}>
                <span>Peye {fmt(pre.totalPaye || 0)}</span>
                <span className="ke-d" style={{ fontSize: 20, color: '#fff' }}>{Math.round(pctPaye)}%</span>
                <span style={{ color: interetKouru > 0 ? T.redD : undefined }}>Rete {fmt(resteAPayer + interetKouru)}</span>
              </div>
              <div className="ke-dtrack" style={{ margin: 0 }}><i style={{ width: `${pctPaye}%`, background: pctPaye >= 100 ? T.gold : T.greenD }} /></div>
            </div>
            <div className="ke-pass-meta">
              <span>{pre.tauxInteret}% / mwa</span>
              <span>{pre.dureeEnMois} mwa · {periodLabel(pre.periode)}</span>
              {pre.clientPhone && <span><Phone size={12} /> {pre.clientPhone}</span>}
              {pre.garantiByens && <span><Home size={12} /> {pre.garantiByens}</span>}
            </div>
          </div>

          <div className="ke-three">
            {tiles.map((t, i) => (
              <div key={t.l} className="ke-mtile" style={{ '--c': t.c, '--cbg': hexA(t.c, .07), animationDelay: `${i * .04}s` }}>
                <p className="ke-label-s">{t.l}</p><p className="v" style={{ fontSize: 22 }}>{t.v}</p>
              </div>
            ))}
          </div>

          {(pre.avalize1Nom || pre.avalize2Nom) && (
            <div className="pre-aval">
              {[{ nom: pre.avalize1Nom, tel: pre.avalize1Phone, l: 'Avalize 1' }, { nom: pre.avalize2Nom, tel: pre.avalize2Phone, l: 'Avalize 2' }].filter(a => a.nom).map(a => (
                <div key={a.l}>
                  <span className="ke-stat-ic" style={{ width: 38, height: 38, borderRadius: 12, background: T.soft, color: T.ink }}><Users size={16} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className="ke-label-s">{a.l}</p>
                    <p style={{ margin: '3px 0 0', fontWeight: 800, fontSize: 14 }}>{a.nom}</p>
                    {a.tel && <p style={{ margin: '1px 0 0', fontSize: 12, color: T.muted, fontWeight: 600 }}>{a.tel}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pre.notes && <Alert color={T.blue} icon={<FileText size={16} />}>{pre.notes}</Alert>}

          {/* Apwobasyon */}
          {pre.statut === 'attente' && isAdminUser && (
            <div className="pre-approve">
              <p><Clock size={16} color={T.orange} /> Prè sa ap tann apwobasyon — okenn lajan poko dekèse.</p>
              {!showReject ? (
                <div className="ke-two">
                  <button className="ke-fbtn main green" onClick={() => setShowApproveConfirm(true)} disabled={mutApprove.isPending}>
                    {mutApprove.isPending ? <Spinner /> : <CheckCircle size={17} />} Apwouve + dekèse
                  </button>
                  <button className="ke-fbtn" style={{ color: T.red, borderColor: hexA(T.red, .3) }} onClick={() => setShowReject(true)}>
                    <XCircle size={17} /> Rejte
                  </button>
                </div>
              ) : (
                <div className="ke-col" style={{ gap: 10 }}>
                  <textarea className="ke-input" autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rezon rejè a (opsyonèl)..." />
                  <div className="ke-two">
                    <button className="ke-fbtn" onClick={() => { setShowReject(false); setRejectReason('') }}>Anile</button>
                    <button className="ke-fbtn main red" onClick={() => mutReject.mutate(rejectReason.trim() || undefined)} disabled={mutReject.isPending}>
                      {mutReject.isPending ? <Spinner /> : <XCircle size={17} />} Konfime rejè
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {pre.statut === 'attente' && !isAdminUser && <Alert color={T.orange} icon={<Clock size={17} />}>Prè sa ap tann apwobasyon yon admin.</Alert>}

          {/* Aksyon */}
          {canPay && (
            <div className="ke-detail-acts" style={{ gridTemplateColumns: resteAPayer <= 0.01 && interetKouru <= 0 ? '1fr auto auto auto' : '1fr auto auto' }}>
              <button className="ke-act dep" onClick={() => onPaieman(pre)} disabled={kesFemen}>{kesFemen ? <Lock size={14} /> : <ArrowDownCircle size={17} />} Anrejistre peman</button>
              <button className="ke-act ic" title="Enprime kontra" onClick={handlePrintKontra} disabled={printer.printing}>{printer.printing ? <Spinner size={14} /> : <Printer size={17} />}</button>
              <button className="ke-act ic goldy" title="Pataje kontra (Imaj / PDF)" onClick={handleShareKontra} disabled={loadingKontra}>{loadingKontra ? <Spinner size={14} /> : <Share2 size={17} />}</button>
              {resteAPayer <= 0.01 && interetKouru <= 0 && (
                <button className="ke-act ic" title="Klotire prè a" style={{ width: 'auto', padding: '0 14px', color: T.goldInk }} onClick={() => mutCloture.mutate()} disabled={mutCloture.isPending}>
                  {mutCloture.isPending ? <Spinner size={14} /> : <CheckCircle size={16} />} Klotire
                </button>
              )}
            </div>
          )}

          <KalandriyeSection preId={preId} />

          {/* Istwa peman */}
          <div>
            <div className="ke-sh"><h3>Istwa peman</h3><span className="ke-count">{paiements.length}</span><span className="ke-rule" /></div>
            <div className="ke-tl">
              {!paiements.length
                ? <div className="ke-empty" style={{ padding: 26 }}>Pa gen peman toujou</div>
                : paiements.map((px, i) => {
                    const preAt = { ...pre, totalPaye: Number(px.balanceAvant || 0) }
                    return (
                      <div key={px.id} className="ke-tx" style={{ '--c': T.green, '--cbg': hexA(T.green, .09), animationDelay: `${Math.min(i, 10) * .04}s` }}>
                        <div className="ke-tx-ic"><ArrowDownCircle size={18} /></div>
                        <div className="ke-tx-mid">
                          <div className="ke-tx-t"><span>Peman</span><span className="ke-tx-amt">+{fmt(px.montant)}</span></div>
                          <p className="ke-tx-s">{fmtDate(px.createdAt)} · {String(px.method || '').toUpperCase()}{px.reference ? ` · ${px.reference}` : ''}</p>
                        </div>
                        <button className="ke-ibtn" title="Enprime" onClick={() => printer.printPre({ pre: preAt, paiement: px, tenant, type: 'paiement' })}><Printer size={15} /></button>
                        <button className="ke-ibtn goldy" title="Pataje resi" onClick={() => setReceipt({ pre: preAt, tenant, type: 'paiement', paiement: px })}><Share2 size={15} /></button>
                        {isAdminUser && <button className="ke-ibtn danger" title="Efase peman" onClick={() => setPixDeleteTarget(px)}><Trash2 size={15} /></button>}
                      </div>
                    )
                  })}
            </div>
          </div>

          {isAdminUser && (
            <div className="ke-danger">
              <p><AlertTriangle size={13} /> Zòn admin — aksyon irevèsib</p>
              <button onClick={() => setShowDeletePreConfirm(true)} disabled={mutDeletePre.isPending}>
                {mutDeletePre.isPending ? <Spinner size={14} /> : <Trash2 size={16} />}
                {mutDeletePre.isPending ? 'Ap efase...' : `Efase prè ${pre.numeroPre}`}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {receipt && <ModalPreReceipt data={receipt} printer={printer} onClose={() => setReceipt(null)} />}

      {showApproveConfirm && (
        <PinConfirmModal title="Apwouve Prè"
          message={`Apwouve prè ${pre.numeroPre} — ${fmt(pre.montant)} HTG ap dekèse pou ${pre.clientNom}. Kontinye?`}
          loading={mutApprove.isPending} onConfirm={(pin) => mutApprove.mutateAsync(pin)} onClose={() => setShowApproveConfirm(false)} />
      )}
      {showDeletePreConfirm && (
        <PinConfirmModal title="Efase Prè"
          message={`Efase prè ${pre.numeroPre} — ${pre.clientNom}? Aksyon sa IREVÈSIB.`}
          loading={mutDeletePre.isPending} onConfirm={(pin) => mutDeletePre.mutateAsync(pin)} onClose={() => setShowDeletePreConfirm(false)} />
      )}
      {pixDeleteTarget && (
        <PinConfirmModal title="Efase Peman"
          message={`Efase peman ${fmt(pixDeleteTarget.montant)} HTG? Total peye a ap korije otomatikman.`}
          onConfirm={confirmDeletePaiement} onClose={() => setPixDeleteTarget(null)} />
      )}
    </>
  )
}