// src/pages/enterprise/kane-epay/KaneEpayModals.jsx
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Modal yo (Kreye, Depo/Retrè, Detay, Fèmen Kès)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import {
  Printer, ArrowDownCircle, ArrowUpCircle, Lock, FileText, Trash2, Share2,
  UserPlus, Camera, Wallet, Hash, Phone, ShieldCheck,
  ShieldAlert, ArrowRight, Landmark, ClipboardCheck, AlertTriangle, Eye,
} from 'lucide-react'
import { fmt, fmtDate, getAccountPrefix, usePDFReceipt } from './kaneEpayUtils'
import { FAMILY_RELATIONS, TX_STYLES, T, FRE_OUVERTURE, QUICK_AMOUNTS } from './kaneEpayConstants'
import { kaneAPI } from './kaneEpayAPI'
import {
  Spinner, Section, Modal, PhotoBox, Field, MethodPicker, AmountField,
  Alert, Avatar, AnimatedNumber, BalanceBar, Lightbox,
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
      const b64 = ev.target.result
      if (type === 'photo')   setPhotoPreview(b64)
      if (type === 'idPhoto') setIdPhotoPreview(b64)
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
      <button className="ke-btn-ghost" onClick={onClose}>Anile</button>
      <button className="ke-btn-main gold" onClick={handleSubmit} disabled={mutation.isPending || opening <= 0}>
        {mutation.isPending ? <><Spinner /> Ap kreye...</> : <><Printer size={16} /> Kreye + Enprime</>}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Nouvo Kont Kanè" subtitle="Enskripsyon kliyan + depo ouverture" icon={<UserPlus size={19} />} width={600} footer={footer}>
      {/* Nimewo otomatik */}
      <div className="ke-numchip">
        <div>
          <p className="l">Nimewo kont</p>
          <p className="v">{prefix}-{new Date().getFullYear()}-•••••</p>
        </div>
        <span className="t"><Hash size={11} /> Otomatik</span>
      </div>

      <Section n={1} title="Enfòmasyon Titilè" delay={0.04}>
        <div className="ke-g2x">
          <Field label="Prenon *" error={errors.firstName}>
            <input className={`ke-input${errors.firstName ? ' err' : ''}`} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Prenon" autoComplete="off" />
          </Field>
          <Field label="Non *" error={errors.lastName}>
            <input className={`ke-input${errors.lastName ? ' err' : ''}`} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Non" autoComplete="off" />
          </Field>
        </div>
        <div className="ke-g2 ke-mt">
          <Field label="NIF / CIN">
            <input className="ke-input" value={form.nifOrCin} onChange={e => set('nifOrCin', e.target.value)} placeholder="001-234-5678" />
          </Field>
          <Field label="Telefòn">
            <input className="ke-input" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509 XXXX XXXX" />
          </Field>
        </div>
        <div className="ke-mt">
          <Field label="Adrès">
            <input className="ke-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." />
          </Field>
        </div>
      </Section>

      <Section n={2} title="Foto KYC" delay={0.08}>
        <div className="ke-g2x">
          <PhotoBox label="Foto kliyan" icon={<Camera size={18} />} preview={photoPreview} inputId="ke-photo" onChange={e => handlePhoto(e,'photo')} hint="Foto figi kliyan" />
          <PhotoBox label="Kat idantite" icon={<ShieldCheck size={18} />} preview={idPhotoPreview} inputId="ke-idphoto" onChange={e => handlePhoto(e,'idPhoto')} hint="CIN, Paspò, lòt ID" />
        </div>
        {!idPhotoPreview && <p style={{ fontSize: 11, color: T.dim, margin: '10px 0 0' }}>San foto kat idantite, kont lan ap make <b style={{ color: T.orange }}>KYC enkonplè</b>.</p>}
      </Section>

      <Section n={3} title="Referans Fanmi" optional delay={0.12}>
        <div className="ke-g2">
          <Field label="Relasyon">
            <select className="ke-input" value={form.familyRelation} onChange={e => set('familyRelation', e.target.value)}>
              <option value="">— Chwazi —</option>
              {FAMILY_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Non referans">
            <input className="ke-input" value={form.familyName} onChange={e => set('familyName', e.target.value)} placeholder="Non konplè" />
          </Field>
        </div>
      </Section>

      <Section n={4} title="Depo Ouverture" delay={0.16}>
        <AmountField label="Montan total kliyan peye *" value={form.openingAmount} onChange={v => set('openingAmount', v)}
          accent={T.gold} quick={[500, 1000, 2500, 5000]} error={errors.openingAmount} />

        <div className="ke-mt">
          <Field label="Montan bloke (opsyonèl)">
            <input type="number" inputMode="decimal" min="0" step="0.01" className="ke-input ke-num"
              style={{ color: T.orange }} value={form.lockedAmount} onChange={e => set('lockedAmount', e.target.value)} placeholder="0,00" />
          </Field>
        </div>

        {opening > 0 && (
          <div className="ke-break">
            <div className="ke-ln"><span className="k">Montan total</span><span className="v" style={{ color: T.gold2 }}>{fmt(opening)} HTG</span></div>
            <div className="ke-ln"><span className="k">Frè ouverture <span className="ke-tag">OTOMATIK</span></span><span className="v" style={{ color: T.red }}>− {fmt(FRE_OUVERTURE)} HTG</span></div>
            {locked > 0 && <div className="ke-ln"><span className="k"><Lock size={12} /> Montan bloke</span><span className="v" style={{ color: T.orange }}>− {fmt(locked)} HTG</span></div>}
            <div className="ke-ln total">
              <span className="k">Balans kont</span>
              <span className="v" style={{ color: balance >= 0 ? T.green : T.red }}><AnimatedNumber value={balance} duration={500} /> HTG</span>
            </div>
            <BalanceBar opening={opening} fee={FRE_OUVERTURE} locked={locked} />
          </div>
        )}
      </Section>

      <Section n={5} title="Metòd Peman" delay={0.2}>
        <MethodPicker value={form.method} onChange={v => set('method', v)} />
        <div className="ke-mt">
          <Field label="Referans (opsyonèl)">
            <input className="ke-input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Egz: MonCash #12345" />
          </Field>
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
      <button className="ke-btn-ghost" onClick={onClose}>Anile</button>
      <button className={`ke-btn-main ${isW ? 'red' : 'green'}`} onClick={submit} disabled={isDisabled}>
        {mutation.isPending ? <Spinner /> : isW ? <ArrowUpCircle size={17} /> : <ArrowDownCircle size={17} />}
        {mutation.isPending ? 'Ap trete...' : amt > 0 ? `Konfime ${fmt(amt)} G` : `Konfime ${isW ? 'Retrè' : 'Depo'}`}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} accent={color} width={460} footer={footer}
      title={isW ? 'Retrè lajan' : 'Depo lajan'} subtitle={`${account.accountNumber} · ${account.firstName} ${account.lastName}`}
      icon={isW ? <ArrowUpCircle size={19} /> : <ArrowDownCircle size={19} />}>
      <div className="ke-stackv">
        <div className="ke-mini-acc">
          <Avatar account={account} size={42} radius={13} />
          <div style={{ minWidth: 0 }}>
            <p className="ke-acc-no">{account.accountNumber}</p>
            <p className="ke-acc-name" style={{ fontSize: 14 }}>{account.firstName} {account.lastName}</p>
          </div>
          <div className="r">
            <p className="l">Balans aktyèl</p>
            <p className="v ke-num">{fmt(bal)}</p>
            {Number(account.lockedAmount) > 0 && <span className="ke-lock"><Lock size={10} /> {fmt(account.lockedAmount)} bloke</span>}
          </div>
        </div>

        <AmountField label={isW ? 'Montan retrè' : 'Montan depo'} value={form.amount}
          onChange={v => setForm(p => ({ ...p, amount: v }))} accent={color} quick={quick}
          allValue={isW ? bal : 0} autoFocus onEnter={submit} />

        {amt > 0 && (balOk ? (
          <div className="ke-preview" style={{ '--accent': color }}>
            <div className="col">
              <p className="l">Anvan</p>
              <p className="v" style={{ color: T.muted }}>{fmt(bal)}</p>
            </div>
            <div className="arrow"><ArrowRight size={16} /></div>
            <div className="col" style={{ textAlign: 'right' }}>
              <p className="l">Nouvo balans</p>
              <p className="v" style={{ color, fontSize: 18 }}><AnimatedNumber value={newBal} duration={450} /> HTG</p>
            </div>
          </div>
        ) : (
          <Alert color={T.red}>Balans ensifizan! Disponib: <strong>{fmt(bal)} HTG</strong></Alert>
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
// MODAL: DETAY — Admin ka efase tranzaksyon/kont (ak PIN)
// ═══════════════════════════════════════════════════════════════
export function ModalDetail({ accountId, onClose, onDepo, onRetrait, printer, kesFemen = false }) {
  const { tenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdminUser = user?.role === 'admin'
  const pdf = usePDFReceipt()
  const [zoom, setZoom] = useState(null)
  const [busyTx, setBusyTx] = useState(null)

  const { data: account, isLoading } = useQuery({
    queryKey: ['kane-account', accountId],
    queryFn:  () => kaneAPI.getOne(accountId).then(r => r.data.account),
    enabled:  !!accountId,
  })

  const [showDeleteAcctConfirm, setShowDeleteAcctConfirm] = useState(false)
  const [txDeleteTarget, setTxDeleteTarget] = useState(null)

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['kane-account', accountId] })
    qc.invalidateQueries({ queryKey: ['kane-accounts'] })
    qc.invalidateQueries({ queryKey: ['kane-stats'] })
  }

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
      invalidateAll()
      setTxDeleteTarget(null)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erè efase tranzaksyon.')
      throw e
    }
  }

  const doPrint = async (tx, type) => { setBusyTx(`p-${tx?.id || type}`); try { await printer.print(account, tx, tenant, type) } finally { setBusyTx(null) } }
  const doShare = async (tx, type) => { setBusyTx(`s-${tx?.id || type}`); try { await pdf.share(account, tx, tenant, type) } finally { setBusyTx(null) } }

  if (isLoading || !account) return (
    <Modal onClose={onClose} title="Detay kont" subtitle="Ap chaje..." icon={<Eye size={19} />} width={600} dismissible>
      <div className="ke-stackv">
        <div className="ke-skel" style={{ height: 170, borderRadius: 22 }} />
        <div className="ke-g2x"><div className="ke-skel" style={{ height: 64, borderRadius: 16 }} /><div className="ke-skel" style={{ height: 64, borderRadius: 16 }} /></div>
        <div className="ke-skel" style={{ height: 46, borderRadius: 12 }} />
        {[0,1,2].map(i => <div key={i} className="ke-skel" style={{ height: 58, borderRadius: 15 }} />)}
      </div>
    </Modal>
  )

  const txs          = account.transactions || []
  const totalDepo    = txs.filter(t => t.type==='depot').reduce((s,t)   => s+Number(t.amount), 0)
  const totalRetrait = txs.filter(t => t.type==='retrait').reduce((s,t) => s+Number(t.amount), 0)
  const hasKyc       = !!account.idPhotoUrl
  const openTx       = txs.find(t => t.type === 'ouverture') || txs[0]
  const infos = [
    account.nifOrCin       && { l: 'NIF / CIN', v: account.nifOrCin },
    account.phone          && { l: 'Telefòn',   v: account.phone },
    account.address        && { l: 'Adrès',     v: account.address },
    (account.familyName || account.familyRelation) && { l: `Referans${account.familyRelation ? ` · ${account.familyRelation}` : ''}`, v: account.familyName || '—' },
  ].filter(Boolean)

  return (
    <>
      <Modal onClose={onClose} title={`${account.firstName} ${account.lastName}`} subtitle={`Kont ${account.accountNumber}`}
        icon={<Wallet size={19} />} width={620} dismissible={!showDeleteAcctConfirm && !txDeleteTarget && !zoom}>
        <div className="ke-stackv">
          {/* Kanè (kat prensipal) */}
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
                <p className="l">BALANS DISPONIB</p>
                <p className="v ke-num"><AnimatedNumber value={account.balance} /><small>HTG</small></p>
              </div>
              {Number(account.lockedAmount) > 0 && <span className="ke-pass-lock"><Lock size={11} /> {fmt(account.lockedAmount)} bloke</span>}
            </div>
            <div className="ke-pass-meta">
              {account.phone && <span><Phone size={11} /> {account.phone}</span>}
              <span>{hasKyc ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />} KYC {hasKyc ? 'konplè' : 'enkonplè'}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="ke-g3 tri">
            <div className="ke-mtile" style={{ '--c': T.green, animationDelay: '.05s' }}><p className="l">Total depo</p><p className="v">+{fmt(totalDepo)}</p></div>
            <div className="ke-mtile" style={{ '--c': T.red, animationDelay: '.1s' }}><p className="l">Total retrè</p><p className="v">−{fmt(totalRetrait)}</p></div>
            <div className="ke-mtile" style={{ '--c': T.blue, animationDelay: '.15s' }}><p className="l">Tranzaksyon</p><p className="v">{txs.length}</p></div>
          </div>

          {/* Aksyon */}
          <div className="ke-row-acts">
            <button className="ke-act dep" onClick={onDepo} disabled={kesFemen}>{kesFemen ? <Lock size={14} /> : <ArrowDownCircle size={16} />} Depo</button>
            <button className="ke-act ret" onClick={onRetrait} disabled={kesFemen}>{kesFemen ? <Lock size={14} /> : <ArrowUpCircle size={16} />} Retrè</button>
            <button className="ke-act ghost" title="Enprime resi ouverture" onClick={() => doPrint(openTx, 'ouverture')} disabled={printer.printing}>
              {printer.printing ? <Spinner size={14} /> : <Printer size={16} />}
            </button>
            <button className="ke-act gold" title="Pataje PDF (WhatsApp, Imèl...)" onClick={() => doShare(openTx, 'ouverture')} disabled={pdf.generating}>
              {pdf.generating ? <Spinner size={14} /> : <Share2 size={16} />}
            </button>
          </div>

          {/* Enfòmasyon */}
          {infos.length > 0 && (
            <div className="ke-info">
              {infos.map(i => (
                <div key={i.l}><p className="l">{i.l}</p><p className="v" title={i.v}>{i.v}</p></div>
              ))}
            </div>
          )}

          {/* KYC */}
          {(account.photoUrl || account.idPhotoUrl) ? (
            <div className="ke-kyc">
              {account.photoUrl   && <button onClick={() => setZoom({ src: account.photoUrl, caption: 'Foto kliyan' })}><img src={account.photoUrl} alt="" /><span>Foto kliyan</span></button>}
              {account.idPhotoUrl && <button onClick={() => setZoom({ src: account.idPhotoUrl, caption: 'Kat idantite' })}><img src={account.idPhotoUrl} alt="" /><span>Kat idantite</span></button>}
            </div>
          ) : (
            <Alert color={T.orange} icon={<ShieldAlert size={16} />}>KYC enkonplè — pa gen foto kat idantite pou kont sa a.</Alert>
          )}

          {/* Istwa */}
          <div>
            <div className="ke-h"><p>Istwa tranzaksyon</p><span>{txs.length}</span></div>
            <div className="ke-tl">
              {!txs.length
                ? <p style={{ textAlign: 'center', color: T.muted, fontSize: 12.5, padding: 22, margin: 0 }}>Pa gen tranzaksyon ankò</p>
                : txs.map((tx, i) => {
                    const cfg = TX_STYLES[tx.type] || TX_STYLES.ouverture
                    const Ic  = TX_ICONS[tx.type] || Landmark
                    return (
                      <div key={tx.id} className="ke-tx" style={{ '--c': cfg.color, animationDelay: `${Math.min(i, 10) * 0.04}s` }}>
                        <div className="ke-tx-ic"><Ic size={17} /></div>
                        <div className="ke-tx-mid">
                          <div className="ke-tx-t">
                            <span>{cfg.label}</span>
                            <span className="ke-tx-amt">{tx.type === 'retrait' ? '−' : '+'}{fmt(tx.amount)} G</span>
                          </div>
                          <p className="ke-tx-s">{fmtDate(tx.createdAt)} · {String(tx.method || '').toUpperCase()}{tx.reference ? ` · ${tx.reference}` : ''}</p>
                        </div>
                        <button className="ke-mini" title="Enprime" onClick={() => doPrint(tx, tx.type)} disabled={printer.printing}>
                          {busyTx === `p-${tx.id}` ? <Spinner size={12} /> : <Printer size={14} />}
                        </button>
                        <button className="ke-mini gold" title="Pataje PDF" onClick={() => doShare(tx, tx.type)} disabled={pdf.generating}>
                          {busyTx === `s-${tx.id}` ? <Spinner size={12} /> : <Share2 size={14} />}
                        </button>
                        {isAdminUser && (
                          <button className="ke-mini red" title="Efase" onClick={() => setTxDeleteTarget(tx)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
            </div>
          </div>

          {/* Zòn admin */}
          {isAdminUser && (
            <div className="ke-danger">
              <p><AlertTriangle size={13} /> Zòn admin</p>
              <button onClick={() => setShowDeleteAcctConfirm(true)} disabled={mutDeleteAccount.isPending}>
                {mutDeleteAccount.isPending ? <Spinner size={14} /> : <Trash2 size={15} />}
                {mutDeleteAccount.isPending ? 'Ap efase...' : `Efase kont ${account.accountNumber}`}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {zoom && <Lightbox src={zoom.src} caption={zoom.caption} onClose={() => setZoom(null)} />}

      {/* PIN — efase kont */}
      {showDeleteAcctConfirm && (
        <PinConfirmModal
          title="Efase Kont"
          message={`Efase kont ${account.accountNumber}? Tout tranzaksyon ap efase. IREVÈSIB.`}
          loading={mutDeleteAccount.isPending}
          onConfirm={(pin) => mutDeleteAccount.mutateAsync(pin)}
          onClose={() => setShowDeleteAcctConfirm(false)}
        />
      )}

      {/* PIN — efase tranzaksyon */}
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
  const difColor = exact ? T.green : diferans > 0 ? T.orange : T.red
  const difLabel = exact ? 'Balans kòrèk — kès la egal ak sistèm nan' : diferans > 0 ? `${fmt(diferans)} HTG anplis nan kès la` : `${fmt(Math.abs(diferans))} HTG ki manke nan kès la`

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
    { label:'Depo Kanè',     val:`${fmt(depoJou)}`,  color:T.green  },
    { label:'Retrè Kanè',    val:`${fmt(retrèJou)}`, color:T.red    },
    { label:'Koleksyon Prè', val:`${fmt(kolPre)}`,   color:T.green  },
    { label:'Dekèsman Prè',  val:`${fmt(desPre)}`,   color:T.orange },
    { label:'Prè aktif',     val:`${preStats?.pretsActifs||0}`, color:T.blue },
    { label:'An reta',       val:`${preStats?.totalEnReta||0}`, color:T.red  },
  ]

  const footer = rapo ? (
    <button className="ke-btn-main gold" onClick={onClose}>Fèmen</button>
  ) : etap === 1 ? (
    <>
      <button className="ke-btn-ghost" onClick={onClose}>Anile</button>
      <button className="ke-btn-main orange" onClick={() => setEtap(2)}>Kontinye <ArrowRight size={16} /></button>
    </>
  ) : (
    <>
      <button className="ke-btn-ghost" onClick={() => setEtap(1)}>← Retou</button>
      <button className="ke-btn-main danger" onClick={handleFemen} disabled={loading || !hasMontant}>
        {loading ? <><Spinner /> Ap fèmen...</> : <><Lock size={16} /> Fèmen kès definitif</>}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} accent={rapo ? T.green : T.orange} width={540} footer={footer}
      title="Fèmen Kès" subtitle={rapo ? 'Jounen an fini' : 'Rapò jounen an · Kanè + Prè'} icon={<ClipboardCheck size={19} />}>
      {!rapo && (
        <div className="ke-steps">
          <div className={`ke-step ${etap === 1 ? 'on' : 'done'}`}><b>{etap > 1 ? '✓' : '1'}</b>Rezime</div>
          <div className="ke-step-line"><i style={{ width: etap > 1 ? '100%' : '0%' }} /></div>
          <div className={`ke-step ${etap === 2 ? 'on' : ''}`}><b>2</b>Konfimasyon</div>
        </div>
      )}

      {etap === 1 && !rapo && (
        <div className="ke-stackv">
          <Alert color={T.orange}>Fèmen kès la ap <strong>bloke paj Kanè ak Prè</strong> jiskaske demen.</Alert>
          <div className="ke-g3">
            {tiles.map((t, i) => (
              <div key={t.label} className="ke-mtile" style={{ '--c': t.color, animationDelay: `${i * 0.05}s` }}>
                <p className="l">{t.label}</p>
                <p className="v">{t.val}</p>
              </div>
            ))}
          </div>
          <div className="ke-break" style={{ marginTop: 0 }}>
            <div className="ke-ln"><span className="k">Lajan ki rantre</span><span className="v" style={{ color: T.green }}>+{fmt(totalCashIn)}</span></div>
            <div className="ke-ln"><span className="k">Lajan ki soti</span><span className="v" style={{ color: T.red }}>−{fmt(totalCashOut)}</span></div>
            <div className="ke-ln total"><span className="k">Nèt sistèm</span><span className="v" style={{ color: T.gold2 }}>{fmt(netSystem)} HTG</span></div>
          </div>
          <Field label="Nòt (opsyonèl)">
            <textarea className="ke-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Obsèvasyon sou jounen an..." />
          </Field>
        </div>
      )}

      {etap === 2 && !rapo && (
        <div className="ke-stackv">
          <Alert color={T.red} icon={<Lock size={16} />}>Etap final — aksyon sa a <strong>pa ka defèt</strong>.</Alert>
          <div className="ke-break" style={{ marginTop: 0 }}>
            <div className="ke-ln"><span className="k">Lajan ki rantre</span><span className="v" style={{ color: T.green }}>+{fmt(totalCashIn)}</span></div>
            <div className="ke-ln"><span className="k">Lajan ki soti</span><span className="v" style={{ color: T.red }}>−{fmt(totalCashOut)}</span></div>
            <div className="ke-ln total"><span className="k">Nèt sistèm</span><span className="v" style={{ color: T.gold2 }}>{fmt(netSystem)} HTG</span></div>
          </div>
          <AmountField label="Montan fizik ki nan kès la *" value={montantFizik} onChange={setMontantFizik}
            accent={T.blue} autoFocus quick={netSystem > 0 ? [Math.round(netSystem * 100) / 100] : []} />
          {hasMontant && (
            <div className="ke-diff" style={{ '--c': difColor }}>
              <div className="top">
                <span className="k">Diferans</span>
                <span className="v">{diferans >= 0 ? '+' : ''}<AnimatedNumber value={diferans} duration={450} className="" /> HTG</span>
              </div>
              <p className="s">{difLabel}</p>
            </div>
          )}
        </div>
      )}

      {rapo && (
        <div className="ke-success">
          <div className="ke-check">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h3>Kès fèmen</h3>
          <p>Montan fizik: <b style={{ color: '#fff' }}>{fmt(montFizikNum)} HTG</b> · Diferans: <b style={{ color: difColor }}>{diferans >= 0 ? '+' : ''}{fmt(diferans)} HTG</b></p>
        </div>
      )}
    </Modal>
  )
}