// src/pages/enterprise/kane-epay/KaneEpayModals.jsx
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Modal yo (Kreye, Depo/Retrè, Detay, Resi, Fèmen Kès)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import {
  Printer, ArrowDownCircle, ArrowUpCircle, Lock, Trash2, Share2,
  UserPlus, Camera, Wallet, Hash, Phone, ShieldCheck, ShieldAlert, ArrowRight,
  Landmark, ClipboardCheck, AlertTriangle, Eye, Image as ImageIcon, FileDown, Receipt,
} from 'lucide-react'
import { fmt, fmtDate, getAccountPrefix, usePDFReceipt } from './kaneEpayUtils'
import { FAMILY_RELATIONS, TX_STYLES, T, FRE_OUVERTURE, QUICK_AMOUNTS, hexA } from './kaneEpayConstants'
import { kaneAPI } from './kaneEpayAPI'
import {
  Spinner, Section, Modal, PhotoBox, Field, MethodPicker, AmountField,
  Alert, Avatar, AnimatedNumber, BalanceBar, Lightbox, Chip, ReceiptPreview,
} from './KaneEpayComponents'
import PinConfirmModal from '../../../components/PinConfirmModal'

const TX_ICONS = { ouverture: Landmark, depot: ArrowDownCircle, retrait: ArrowUpCircle }

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE KONT — Frè 250G otomatik
// ═══════════════════════════════════════════════════════════════
export function ModalCreate({ onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const prefix = getAccountPrefix(tenant)

  const [form, setForm] = useState({
    firstName:'', lastName:'', address:'', nifOrCin:'', phone:'',
    familyRelation:'', familyName:'', openingAmount:'', lockedAmount:'',
    method:'cash', reference:'',
  })
  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [errors, setErrors] = useState({})

  const set     = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: undefined })) }
  const opening = Number(form.openingAmount || 0)
  const locked  = Number(form.lockedAmount  || 0)
  const balance = opening - FRE_OUVERTURE - locked

  const handlePhoto = (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = (ev) => {
      if (type === 'photo')   setPhotoPreview(ev.target.result)
      if (type === 'idPhoto') setIdPhotoPreview(ev.target.result)
    }
    r.readAsDataURL(file)
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Obligatwa'
    if (!form.lastName.trim())  e.lastName  = 'Obligatwa'
    if (opening <= 0)           e.openingAmount = 'Montan dwe pi gran pase 0'
    else if (balance < 0)       e.openingAmount = `Montan an dwe omwen ${fmt(FRE_OUVERTURE + locked)} HTG (frè + bloke)`
    setErrors(e); return !Object.keys(e).length
  }

  const mutation = useMutation({
    mutationFn: (d) => kaneAPI.create(d),
    onSuccess: async (res) => {
      const acc = res.data.account
      toast.success(`Kont ${acc.accountNumber} kreye!`)
      onSuccess(); onClose()
      try { await printer.print(acc, { createdAt: new Date(), method: form.method, reference: form.reference }, tenant, 'ouverture') }
      catch { toast('Kont kreye — Printer pa disponib.', { icon: '⚠️' }) }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan enskripsyon.'),
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      address: form.address||undefined, nifOrCin: form.nifOrCin||undefined,
      phone: form.phone||undefined, familyRelation: form.familyRelation||undefined,
      familyName: form.familyName||undefined, openingAmount: opening,
      lockedAmount: locked, method: form.method,
      reference: form.reference||undefined, accountPrefix: prefix,
      photoUrl: photoPreview||undefined, idPhotoUrl: idPhotoPreview||undefined,
    })
  }

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main gold" onClick={handleSubmit} disabled={mutation.isPending || opening <= 0}>
        {mutation.isPending ? <><Spinner /> Ap kreye...</> : <><Printer size={17} /> Kreye + Enprime</>}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Nouvo Kont" subtitle="Enskripsyon kliyan + depo ouverture" icon={<UserPlus size={20} />} width={620} footer={footer}>
      <div className="ke-numchip">
        <div>
          <span className="ke-eyebrow">Nimewo kont</span>
          <p className="v">{prefix}-{new Date().getFullYear()}-•••••</p>
        </div>
        <Chip dark icon={<Hash size={12} />}>Otomatik</Chip>
      </div>

      <Section n={1} title="Titilè kont lan" delay={0.04}>
        <div className="ke-two">
          <Field label="Prenon *" error={errors.firstName}>
            <input className={`ke-input${errors.firstName ? ' err' : ''}`} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Prenon" autoComplete="off" />
          </Field>
          <Field label="Non *" error={errors.lastName}>
            <input className={`ke-input${errors.lastName ? ' err' : ''}`} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Non" autoComplete="off" />
          </Field>
        </div>
        <div className="ke-two-r ke-mt">
          <Field label="NIF / CIN"><input className="ke-input" value={form.nifOrCin} onChange={e => set('nifOrCin', e.target.value)} placeholder="001-234-5678" /></Field>
          <Field label="Telefòn"><input className="ke-input" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509 XXXX XXXX" /></Field>
        </div>
        <div className="ke-mt">
          <Field label="Adrès"><input className="ke-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." /></Field>
        </div>
      </Section>

      <Section n={2} title="Foto KYC" delay={0.08}>
        <div className="ke-two">
          <PhotoBox label="Foto kliyan" icon={<Camera size={18} />} preview={photoPreview} inputId="ke-photo" onChange={e => handlePhoto(e,'photo')} hint="Foto figi kliyan" />
          <PhotoBox label="Kat idantite" icon={<ShieldCheck size={18} />} preview={idPhotoPreview} inputId="ke-idphoto" onChange={e => handlePhoto(e,'idPhoto')} hint="CIN, Paspò, lòt ID" />
        </div>
        {!idPhotoPreview && <p className="ke-hint">San foto kat idantite, kont lan ap make <b style={{ color: T.orange }}>KYC enkonplè</b>.</p>}
      </Section>

      <Section n={3} title="Referans fanmi" optional delay={0.12}>
        <div className="ke-two-r">
          <Field label="Relasyon">
            <select className="ke-input" value={form.familyRelation} onChange={e => set('familyRelation', e.target.value)}>
              <option value="">— Chwazi —</option>
              {FAMILY_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Non referans"><input className="ke-input" value={form.familyName} onChange={e => set('familyName', e.target.value)} placeholder="Non konplè" /></Field>
        </div>
      </Section>

      <Section n={4} title="Depo ouverture" delay={0.16}>
        <AmountField label="Montan total kliyan peye *" value={form.openingAmount} onChange={v => set('openingAmount', v)}
          accent={T.gold} quick={[500, 1000, 2500, 5000]} error={errors.openingAmount} />
        <div className="ke-mt">
          <Field label="Montan bloke (opsyonèl)" hint="Kòb kliyan an pa ka retire, men li rete sou kont lan.">
            <input type="number" inputMode="decimal" min="0" step="0.01" className="ke-input" value={form.lockedAmount} onChange={e => set('lockedAmount', e.target.value)} placeholder="0,00" />
          </Field>
        </div>
        {opening > 0 && (
          <div className="ke-summary">
            <div className="line"><span>Montan total</span><b>{fmt(opening)} HTG</b></div>
            <div className="line"><span>Frè ouverture <span className="ke-tag">OTOMATIK</span></span><b style={{ color: T.red }}>− {fmt(FRE_OUVERTURE)} HTG</b></div>
            {locked > 0 && <div className="line"><span><Lock size={12} /> Montan bloke</span><b style={{ color: T.orange }}>− {fmt(locked)} HTG</b></div>}
            <div className="total">
              <span>Balans kont</span>
              <b style={{ color: balance >= 0 ? T.ink : T.red }}><AnimatedNumber value={balance} duration={500} /> <small style={{ fontSize: 14, color: T.muted }}>HTG</small></b>
            </div>
            <BalanceBar opening={opening} fee={FRE_OUVERTURE} locked={locked} />
          </div>
        )}
      </Section>

      <Section n={5} title="Metòd peman" delay={0.2}>
        <MethodPicker value={form.method} onChange={v => set('method', v)} />
        <div className="ke-mt">
          <Field label="Referans (opsyonèl)"><input className="ke-input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Egz: MonCash #12345" /></Field>
        </div>
      </Section>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DEPO / RETRÈ
// ═══════════════════════════════════════════════════════════════
export function ModalTx({ account, type, onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({ amount:'', method:'cash', reference:'' })
  const amt    = Number(form.amount || 0)
  const isW    = type === 'retrait'
  const color  = isW ? T.red : T.green
  const onDark = isW ? T.redD : T.greenD
  const bal    = Number(account.balance)
  const newBal = isW ? bal - amt : bal + amt
  const balOk  = !isW || amt <= bal

  const mutation = useMutation({
    mutationFn: (d) => isW ? kaneAPI.withdraw(account.id, d) : kaneAPI.deposit(account.id, d),
    onSuccess: async (res) => {
      const { transaction } = res.data
      toast.success(`${isW ? 'Retrè' : 'Depo'} ${fmt(transaction.amount)} HTG fèt!`)
      onSuccess(); onClose()
      try { await printer.print(account, transaction, tenant, type) } catch {}
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè tranzaksyon.'),
  })
  const isDisabled = mutation.isPending || amt <= 0 || !balOk
  const submit = () => { if (!isDisabled) mutation.mutate({ amount:amt, method:form.method, reference:form.reference||undefined }) }
  const quick = isW ? QUICK_AMOUNTS.filter(q => q <= bal).slice(0, 4) : QUICK_AMOUNTS

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className={`ke-fbtn main ${isW ? 'red' : 'green'}`} onClick={submit} disabled={isDisabled}>
        {mutation.isPending ? <Spinner /> : isW ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
        {mutation.isPending ? 'Ap trete...' : amt > 0 ? `Konfime ${fmt(amt)} G` : `Konfime ${isW ? 'retrè' : 'depo'}`}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} accent={onDark} width={480} footer={footer}
      title={isW ? 'Retrè' : 'Depo'} subtitle={`${account.accountNumber} · ${account.firstName} ${account.lastName}`}
      icon={isW ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}>
      <div className="ke-col">
        <div className="ke-mini">
          <Avatar account={account} size={46} radius={15} />
          <div style={{ minWidth: 0 }}>
            <p className="ke-acc-no">{account.accountNumber}</p>
            <p className="ke-acc-name">{account.firstName} {account.lastName}</p>
          </div>
          <div className="r">
            <p className="ke-label-s">Balans aktyèl</p>
            <p className="v">{fmt(bal)}</p>
            {Number(account.lockedAmount) > 0 && <Chip color={T.orange} icon={<Lock size={10} />}>{fmt(account.lockedAmount)} bloke</Chip>}
          </div>
        </div>

        <AmountField label={isW ? 'Montan retrè' : 'Montan depo'} value={form.amount}
          onChange={v => setForm(p => ({ ...p, amount: v }))} accent={onDark} quick={quick}
          allValue={isW ? bal : 0} autoFocus onEnter={submit} />

        {amt > 0 && (balOk ? (
          <div className="ke-preview" style={{ '--cbg': hexA(color, .06), '--cbd': hexA(color, .25) }}>
            <div>
              <p className="ke-label-s">Anvan</p>
              <p className="v" style={{ color: T.muted }}>{fmt(bal)}</p>
            </div>
            <div className="arrow"><ArrowRight size={16} /></div>
            <div style={{ textAlign: 'right' }}>
              <p className="ke-label-s">Nouvo balans</p>
              <p className="v" style={{ color }}><AnimatedNumber value={newBal} duration={450} /></p>
            </div>
          </div>
        ) : (
          <Alert color={T.red}>Balans ensifizan! Disponib: <b>{fmt(bal)} HTG</b></Alert>
        ))}

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
// MODAL: RESI — Aperçu + Pataje Imaj / PDF + Enprime
// ═══════════════════════════════════════════════════════════════
export function ModalReceipt({ account, transaction, type, onClose, printer }) {
  const { tenant } = useAuthStore()
  const pdf = usePDFReceipt()
  const label = TX_STYLES[type]?.label || 'Resi'
  // ✅ Prepare imaj la depi fenèt la louvri → « Pataje imaj » imedya (pa ekspire)
  useEffect(() => { pdf.prepare(account, transaction, tenant, type, 'png') }, [account?.id, transaction?.id, type]) // eslint-disable-line

  const footer = (
    <>
      <button className="ke-fbtn" onClick={() => printer?.print(account, transaction, tenant, type)} disabled={!printer || printer.printing} style={{ flex: '0 0 52px', padding: 0 }} title="Enprime (termik)">
        {printer?.printing ? <Spinner /> : <Printer size={18} />}
      </button>
      <button className="ke-fbtn" onClick={() => pdf.share(account, transaction, tenant, type, 'pdf')} disabled={!!pdf.generating}>
        {pdf.generating === 'pdf' ? <Spinner /> : <FileDown size={18} />} PDF
      </button>
      <button className="ke-fbtn main dark" onClick={() => pdf.share(account, transaction, tenant, type, 'png')} disabled={!!pdf.generating}>
        {pdf.generating === 'png' ? <Spinner /> : <ImageIcon size={18} />} Pataje imaj
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} dismissible width={520} footer={footer} icon={<Receipt size={20} />}
      title={`Resi ${label}`} subtitle={`${account.accountNumber} · ${account.firstName} ${account.lastName}`}>
      <ReceiptPreview account={account} transaction={transaction} tenant={tenant} type={type} />
      <p className="ke-rcpt-note"><Share2 size={14} /> Imaj la parèt dirèkteman nan WhatsApp. PDF la bon pou imèl oswa pou enprime.</p>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY — Admin ka efase tranzaksyon/kont (ak PIN)
// ═══════════════════════════════════════════════════════════════
export function ModalDetail({ accountId, onClose, onDepo, onRetrait, printer, kesFemen = false }) {
  const { tenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdminUser = user?.role === 'admin'
  const [zoom, setZoom] = useState(null)
  const [receipt, setReceipt] = useState(null)   // { tx, type }
  const [busyTx, setBusyTx] = useState(null)

  const { data: account, isLoading } = useQuery({
    queryKey: ['kane-account', accountId],
    queryFn:  () => kaneAPI.getOne(accountId).then(r => r.data.account),
    enabled:  !!accountId,
  })

  const [showDeleteAcctConfirm, setShowDeleteAcctConfirm] = useState(false)
  const [txDeleteTarget, setTxDeleteTarget] = useState(null)

  const mutDeleteAccount = useMutation({
    mutationFn: (pin) => kaneAPI.deleteAccount(accountId, pin),
    onSuccess: () => {
      toast.success('Kont efase!')
      qc.invalidateQueries({ queryKey: ['kane-accounts'] })
      qc.invalidateQueries({ queryKey: ['kane-stats'] })
      setShowDeleteAcctConfirm(false)
      onClose()
    },
    onError: e => toast.error(e.response?.data?.message || 'Erè efase kont.'),
  })

  const confirmDeleteTx = async (pin) => {
    try {
      await kaneAPI.deleteTransaction(txDeleteTarget.id, pin)
      toast.success('Tranzaksyon efase!')
      qc.invalidateQueries({ queryKey: ['kane-account', accountId] })
      qc.invalidateQueries({ queryKey: ['kane-accounts'] })
      qc.invalidateQueries({ queryKey: ['kane-stats'] })
      setTxDeleteTarget(null)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erè efase tranzaksyon.')
      throw e
    }
  }

  const doPrint = async (tx, type) => { setBusyTx(`p-${tx?.id || type}`); try { await printer.print(account, tx, tenant, type) } finally { setBusyTx(null) } }

  if (isLoading || !account) return (
    <Modal onClose={onClose} title="Detay kont" subtitle="Ap chaje..." icon={<Eye size={20} />} width={640} dismissible>
      <div className="ke-col">
        <div className="ke-skel" style={{ height: 200, borderRadius: 24 }} />
        <div className="ke-three">{[0,1,2].map(i => <div key={i} className="ke-skel" style={{ height: 72, borderRadius: 18 }} />)}</div>
        <div className="ke-skel" style={{ height: 50, borderRadius: 15 }} />
        {[0,1,2].map(i => <div key={i} className="ke-skel" style={{ height: 64, borderRadius: 17 }} />)}
      </div>
    </Modal>
  )

  const txs          = account.transactions || []
  const totalDepo    = txs.filter(t => t.type==='depot').reduce((s,t)   => s+Number(t.amount), 0)
  const totalRetrait = txs.filter(t => t.type==='retrait').reduce((s,t) => s+Number(t.amount), 0)
  const hasKyc       = !!account.idPhotoUrl
  const openTx       = txs.find(t => t.type === 'ouverture') || txs[0]
  const infos = [
    account.nifOrCin && { l: 'NIF / CIN', v: account.nifOrCin },
    account.phone    && { l: 'Telefòn',   v: account.phone },
    account.address  && { l: 'Adrès',     v: account.address },
    (account.familyName || account.familyRelation) && { l: `Referans${account.familyRelation ? ` · ${account.familyRelation}` : ''}`, v: account.familyName || '—' },
  ].filter(Boolean)
  const tiles = [
    { l: 'Total depo',  v: `+${fmt(totalDepo)}`,    c: T.green },
    { l: 'Total retrè', v: `−${fmt(totalRetrait)}`, c: T.red },
    { l: 'Tranzaksyon', v: txs.length,             c: T.blue },
  ]

  return (
    <>
      <Modal onClose={onClose} title={`${account.firstName} ${account.lastName}`} subtitle={`Kont ${account.accountNumber}`}
        icon={<Wallet size={20} />} width={640} dismissible={!showDeleteAcctConfirm && !txDeleteTarget && !zoom && !receipt}>
        <div className="ke-col">
          <div className="ke-pass">
            <div className="ke-pass-top">
              <button className="ke-pass-ph" onClick={() => account.photoUrl && setZoom({ src: account.photoUrl, caption: 'Foto kliyan' })}
                style={{ cursor: account.photoUrl ? 'zoom-in' : 'default' }} aria-label="Foto kliyan">
                {account.photoUrl ? <img src={account.photoUrl} alt="" /> : `${account.firstName?.[0] || ''}${account.lastName?.[0] || ''}`.toUpperCase()}
              </button>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="ke-pass-name">{account.firstName} {account.lastName}</p>
                <p className="ke-pass-no">{account.accountNumber}</p>
              </div>
              <div className="ke-pass-chip" />
            </div>
            <div className="ke-pass-bal">
              <div>
                <span className="ke-eyebrow"><Wallet size={13} /> Balans disponib</span>
                <p className="v"><AnimatedNumber value={account.balance} /><small>HTG</small></p>
              </div>
            </div>
            <div className="ke-pass-meta">
              {Number(account.lockedAmount) > 0 && <span style={{ color: T.gold }}><Lock size={12} /> {fmt(account.lockedAmount)} bloke</span>}
              {account.phone && <span><Phone size={12} /> {account.phone}</span>}
              <span>{hasKyc ? <ShieldCheck size={13} color={T.greenD} /> : <ShieldAlert size={13} color={T.gold} />} KYC {hasKyc ? 'konplè' : 'enkonplè'}</span>
            </div>
          </div>

          <div className="ke-three">
            {tiles.map((t, i) => (
              <div key={t.l} className="ke-mtile" style={{ '--c': t.c, '--cbg': hexA(t.c, .07), animationDelay: `${0.05 + i * 0.05}s` }}>
                <p className="ke-label-s">{t.l}</p>
                <p className="v">{t.v}</p>
              </div>
            ))}
          </div>

          <div className="ke-detail-acts">
            <button className="ke-act dep" onClick={onDepo} disabled={kesFemen}>{kesFemen ? <Lock size={14} /> : <ArrowDownCircle size={17} />} Depo</button>
            <button className="ke-act ret" onClick={onRetrait} disabled={kesFemen}>{kesFemen ? <Lock size={14} /> : <ArrowUpCircle size={17} />} Retrè</button>
            <button className="ke-act ic" title="Enprime resi ouverture" onClick={() => doPrint(openTx, 'ouverture')} disabled={printer.printing}>
              {printer.printing ? <Spinner size={14} /> : <Printer size={17} />}
            </button>
            <button className="ke-act ic goldy" title="Pataje resi (Imaj / PDF)" onClick={() => setReceipt({ tx: openTx, type: 'ouverture' })}>
              <Share2 size={17} />
            </button>
          </div>

          {infos.length > 0 && (
            <div className="ke-info">
              {infos.map(i => <div key={i.l}><p className="ke-label-s">{i.l}</p><p className="v" title={i.v}>{i.v}</p></div>)}
            </div>
          )}

          {(account.photoUrl || account.idPhotoUrl) ? (
            <div className="ke-kyc">
              {account.photoUrl   && <button onClick={() => setZoom({ src: account.photoUrl, caption: 'Foto kliyan' })}><img src={account.photoUrl} alt="" /><span>Foto kliyan</span></button>}
              {account.idPhotoUrl && <button onClick={() => setZoom({ src: account.idPhotoUrl, caption: 'Kat idantite' })}><img src={account.idPhotoUrl} alt="" /><span>Kat idantite</span></button>}
            </div>
          ) : (
            <Alert color={T.orange} icon={<ShieldAlert size={17} />}>KYC enkonplè — pa gen foto kat idantite pou kont sa a.</Alert>
          )}

          <div>
            <div className="ke-sh"><h3>Istwa</h3><span className="ke-count">{txs.length}</span><span className="ke-rule" /></div>
            <div className="ke-tl">
              {!txs.length
                ? <div className="ke-empty" style={{ padding: 26 }}>Pa gen tranzaksyon ankò</div>
                : txs.map((tx, i) => {
                    const cfg = TX_STYLES[tx.type] || TX_STYLES.ouverture
                    const Ic  = TX_ICONS[tx.type] || Landmark
                    return (
                      <div key={tx.id} className="ke-tx" style={{ '--c': cfg.color, '--cbg': cfg.bg, animationDelay: `${Math.min(i, 10) * 0.04}s` }}>
                        <div className="ke-tx-ic"><Ic size={18} /></div>
                        <div className="ke-tx-mid">
                          <div className="ke-tx-t">
                            <span>{cfg.label}</span>
                            <span className="ke-tx-amt">{tx.type === 'retrait' ? '−' : '+'}{fmt(tx.amount)}</span>
                          </div>
                          <p className="ke-tx-s">{fmtDate(tx.createdAt)} · {String(tx.method || '').toUpperCase()}{tx.reference ? ` · ${tx.reference}` : ''}</p>
                        </div>
                        <button className="ke-ibtn" title="Enprime" onClick={() => doPrint(tx, tx.type)} disabled={printer.printing}>
                          {busyTx === `p-${tx.id}` ? <Spinner size={12} /> : <Printer size={15} />}
                        </button>
                        <button className="ke-ibtn goldy" title="Pataje resi" onClick={() => setReceipt({ tx, type: tx.type })}>
                          <Share2 size={15} />
                        </button>
                        {isAdminUser && (
                          <button className="ke-ibtn danger" title="Efase" onClick={() => setTxDeleteTarget(tx)}><Trash2 size={15} /></button>
                        )}
                      </div>
                    )
                  })}
            </div>
          </div>

          {isAdminUser && (
            <div className="ke-danger">
              <p><AlertTriangle size={13} /> Zòn admin</p>
              <button onClick={() => setShowDeleteAcctConfirm(true)} disabled={mutDeleteAccount.isPending}>
                {mutDeleteAccount.isPending ? <Spinner size={14} /> : <Trash2 size={16} />}
                {mutDeleteAccount.isPending ? 'Ap efase...' : `Efase kont ${account.accountNumber}`}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {receipt && <ModalReceipt account={account} transaction={receipt.tx} type={receipt.type} printer={printer} onClose={() => setReceipt(null)} />}
      {zoom && <Lightbox src={zoom.src} caption={zoom.caption} onClose={() => setZoom(null)} />}

      {showDeleteAcctConfirm && (
        <PinConfirmModal
          title="Efase Kont"
          message={`Efase kont ${account.accountNumber}? Tout tranzaksyon ap efase. IREVÈSIB.`}
          loading={mutDeleteAccount.isPending}
          onConfirm={(pin) => mutDeleteAccount.mutateAsync(pin)}
          onClose={() => setShowDeleteAcctConfirm(false)}
        />
      )}
      {txDeleteTarget && (
        <PinConfirmModal
          title="Efase Tranzaksyon"
          message={`Efase tranzaksyon ${TX_STYLES[txDeleteTarget.type]?.label || txDeleteTarget.type} ${fmt(txDeleteTarget.amount)} HTG?`}
          onConfirm={confirmDeleteTx}
          onClose={() => setTxDeleteTarget(null)}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: FÈMEN KÈS
// ═══════════════════════════════════════════════════════════════
export function ModalRapoKesyeKane({ onClose, onKesFemen, statsKane }) {
  const qc = useQueryClient()
  const [etap,         setEtap]         = useState(1)
  const [notes,        setNotes]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [rapo,         setRapo]         = useState(null)
  const [montantFizik, setMontantFizik] = useState('')
  const [preStats,     setPreStats]     = useState(null)

  useEffect(() => {
    api.get('/pre/stats').then(r => setPreStats(r.data.stats)).catch(() => {})
  }, [])

  const depoJou      = Number(statsKane?.todayDepositAmount  || 0)
  const retrèJou     = Number(statsKane?.todayWithdrawAmount || 0)
  const kolPre       = Number(preStats?.totalPaiemanMwa || 0)
  const desPre       = Number(preStats?.totalDesèmanMwa || 0)
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
      const res = await kaneAPI.femenKes({ notes: notesFinale })
      setRapo(res.data.rapo || { ok: true })
      toast.success('Kès fèmen!')
      qc.invalidateQueries({ queryKey: ['kes-status'] })
      onKesFemen()
    } catch (e) { toast.error(e.response?.data?.message || 'Erè fèmen kès.') }
    finally { setLoading(false) }
  }

  const tiles = [
    { l:'Depo Kanè',     v:fmt(depoJou),  c:T.green  },
    { l:'Retrè Kanè',    v:fmt(retrèJou), c:T.red    },
    { l:'Koleksyon Prè', v:fmt(kolPre),   c:T.teal   },
    { l:'Dekèsman Prè',  v:fmt(desPre),   c:T.orange },
    { l:'Prè aktif',     v:preStats?.pretsActifs || 0, c:T.blue },
    { l:'An reta',       v:preStats?.totalEnReta || 0, c:T.red  },
  ]
  const Summary = () => (
    <div className="ke-summary" style={{ marginTop: 0 }}>
      <div className="line"><span>Lajan ki rantre</span><b style={{ color: T.green }}>+{fmt(totalCashIn)}</b></div>
      <div className="line"><span>Lajan ki soti</span><b style={{ color: T.red }}>−{fmt(totalCashOut)}</b></div>
      <div className="total"><span>Nèt sistèm</span><b>{fmt(netSystem)} <small style={{ fontSize: 14, color: T.muted }}>HTG</small></b></div>
    </div>
  )

  const footer = rapo ? (
    <button className="ke-fbtn main dark" onClick={onClose}>Fèmen</button>
  ) : etap === 1 ? (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main dark" onClick={() => setEtap(2)}>Kontinye <ArrowRight size={17} /></button>
    </>
  ) : (
    <>
      <button className="ke-fbtn" onClick={() => setEtap(1)}>← Retou</button>
      <button className="ke-fbtn main danger" onClick={handleFemen} disabled={loading || !hasMontant}>
        {loading ? <><Spinner /> Ap fèmen...</> : <><Lock size={17} /> Fèmen kès definitif</>}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} width={560} footer={footer} accent={T.gold}
      title="Fèmen kès" subtitle={rapo ? 'Jounen an fini' : 'Rapò jounen an · Kanè + Prè'} icon={<ClipboardCheck size={20} />}>
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
          <div className="ke-three">
            {tiles.map((t, i) => (
              <div key={t.l} className="ke-mtile" style={{ '--c': t.c, '--cbg': hexA(t.c, .07), animationDelay: `${i * 0.05}s` }}>
                <p className="ke-label-s">{t.l}</p>
                <p className="v" style={{ fontSize: 22 }}>{t.v}</p>
              </div>
            ))}
          </div>
          <Summary />
          <Field label="Nòt (opsyonèl)">
            <textarea className="ke-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Obsèvasyon sou jounen an..." />
          </Field>
        </div>
      )}

      {etap === 2 && !rapo && (
        <div className="ke-col">
          <Alert color={T.red} icon={<Lock size={17} />}>Etap final — aksyon sa a <b>pa ka defèt</b>.</Alert>
          <Summary />
          <AmountField label="Montan fizik ki nan kès la *" value={montantFizik} onChange={setMontantFizik}
            accent={T.blueD} autoFocus quick={netSystem > 0 ? [Math.round(netSystem * 100) / 100] : []} />
          {hasMontant && (
            <div className="ke-diff" style={{ '--c': difColor }}>
              <div>
                <span className="k">Diferans</span>
                <p className="s">{difLabel}</p>
              </div>
              <span className="v">{diferans >= 0 ? '+' : ''}<AnimatedNumber value={diferans} duration={450} /></span>
            </div>
          )}
        </div>
      )}

      {rapo && (
        <div className="ke-success">
          <div className="ke-check">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h3>Kès fèmen</h3>
          <p>Montan fizik: <b style={{ color: T.ink }}>{fmt(montFizikNum)} HTG</b> · Diferans: <b style={{ color: exact ? T.green : diferans > 0 ? T.orange : T.red }}>{diferans >= 0 ? '+' : ''}{fmt(diferans)} HTG</b></p>
        </div>
      )}
    </Modal>
  )
}