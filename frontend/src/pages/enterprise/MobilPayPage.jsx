// src/pages/enterprise/MobilPayPage.jsx
// ✅ Design "Plus Fit" (menm konsèp ak Sabotay / Kanè Epay / Prè)
// ✅ Aksè kontwole pa super admin via allowedPages (pa gen blokaj plan)
// ✅ NOUVO: lyen peman parèt nan yon modal (Kopye / Pataje WhatsApp) — pa nan yon toast ki disparèt
// ✅ NOUVO: konfimasyon manyèl nan yon modal pwòp (pa window.confirm)
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Phone, Plus, Search, RefreshCw, CheckCircle, XCircle, Copy, X, Wifi, WifiOff,
  Settings, Smartphone, ShieldCheck, Link2, Share2, Clock, Wallet, Hash, Inbox, AlertCircle, Ban,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import { KANE_STYLES, T as K, hexA, todayLabel } from './kane-epay/kaneEpayConstants'
import { Modal, StatCard, AnimatedNumber, Chip, Spinner, Field } from './kane-epay/KaneEpayComponents'

const TR = {
  ht: {
    title: 'MonCash & NatCash', subtitle: 'Resevwa peman mobil ak verifye tranzaksyon',
    newRequest: 'Nouvo demann', newTab: 'Tranzaksyon', verifyTab: 'Verifye',
    amount: 'Montan', phone: 'Nimewo telefòn', provider: 'Pwovidè',
    description: 'Deskripsyon', reference: 'Referans', status: 'Estati',
    pending: 'Annatant', confirmed: 'Konfime', failed: 'Echwe', cancelled: 'Anile',
    cancel: 'Anile', create: 'Kreye demann', verify: 'Verifye',
    transactionId: 'ID tranzaksyon', enterTransId: 'Antre ID tranzaksyon an',
    checkTransaction: 'Verifye', verifyResult: 'Rezilta verifikasyon',
    noData: 'Pa gen tranzaksyon.', copyLink: 'Kopye lyen', paymentLink: 'Lyen peman',
    totalReceived: 'Total resevwa', totalPending: 'Annatant', countTx: 'Tranzaksyon',
    today: 'Jodi a', week: 'Semèn sa a', month: 'Mwa sa a',
    moncashConfig: 'Konfigirasyon MonCash', natcashConfig: 'Konfigirasyon NatCash',
    clientKey: 'Client Key', clientSecret: 'Client Secret', mode: 'Mòd',
    sandbox: 'Sandbox (tès)', production: 'Production', saveConfig: 'Sove',
    testConn: 'Tès koneksyon', connected: 'Konekte', disconnected: 'Dekonekte',
    confirmMark: 'Konfime tranzaksyon sa a manyèlman?', manualConfirm: 'Konfime manyèl',
    copySuccess: 'Kopye!', apiError: 'Erè koneksyon ak sèvè a.', all: 'Tout',
    share: 'Pataje', done: 'Fini', linkReady: 'Lyen an pare', required: 'Telefòn ak montan obligatwa.',
  },
  fr: {
    title: 'MonCash & NatCash', subtitle: 'Recevez des paiements mobiles et vérifiez les transactions',
    newRequest: 'Nouvelle demande', newTab: 'Transactions', verifyTab: 'Vérifier',
    amount: 'Montant', phone: 'Numéro de téléphone', provider: 'Fournisseur',
    description: 'Description', reference: 'Référence', status: 'Statut',
    pending: 'En attente', confirmed: 'Confirmé', failed: 'Échoué', cancelled: 'Annulé',
    cancel: 'Annuler', create: 'Créer demande', verify: 'Vérifier',
    transactionId: 'ID transaction', enterTransId: "Entrez l'ID de transaction",
    checkTransaction: 'Vérifier', verifyResult: 'Résultat de vérification',
    noData: 'Aucune transaction.', copyLink: 'Copier lien', paymentLink: 'Lien de paiement',
    totalReceived: 'Total reçu', totalPending: 'En attente', countTx: 'Transactions',
    today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois',
    moncashConfig: 'Configuration MonCash', natcashConfig: 'Configuration NatCash',
    clientKey: 'Client Key', clientSecret: 'Client Secret', mode: 'Mode',
    sandbox: 'Sandbox (test)', production: 'Production', saveConfig: 'Sauvegarder',
    testConn: 'Tester', connected: 'Connecté', disconnected: 'Déconnecté',
    confirmMark: 'Confirmer cette transaction manuellement ?', manualConfirm: 'Confirmation manuelle',
    copySuccess: 'Copié !', apiError: 'Erreur de connexion au serveur.', all: 'Tous',
    share: 'Partager', done: 'Terminé', linkReady: 'Lien prêt', required: 'Téléphone et montant obligatoires.',
  },
  en: {
    title: 'MonCash & NatCash', subtitle: 'Receive mobile payments and verify transactions',
    newRequest: 'New request', newTab: 'Transactions', verifyTab: 'Verify',
    amount: 'Amount', phone: 'Phone number', provider: 'Provider',
    description: 'Description', reference: 'Reference', status: 'Status',
    pending: 'Pending', confirmed: 'Confirmed', failed: 'Failed', cancelled: 'Cancelled',
    cancel: 'Cancel', create: 'Create request', verify: 'Verify',
    transactionId: 'Transaction ID', enterTransId: 'Enter transaction ID',
    checkTransaction: 'Verify', verifyResult: 'Verification result',
    noData: 'No transactions yet.', copyLink: 'Copy link', paymentLink: 'Payment link',
    totalReceived: 'Total received', totalPending: 'Pending', countTx: 'Transactions',
    today: 'Today', week: 'This week', month: 'This month',
    moncashConfig: 'MonCash configuration', natcashConfig: 'NatCash configuration',
    clientKey: 'Client Key', clientSecret: 'Client Secret', mode: 'Mode',
    sandbox: 'Sandbox (test)', production: 'Production', saveConfig: 'Save',
    testConn: 'Test connection', connected: 'Connected', disconnected: 'Disconnected',
    confirmMark: 'Manually confirm this transaction?', manualConfirm: 'Manual confirm',
    copySuccess: 'Copied!', apiError: 'Server connection error.', all: 'All',
    share: 'Share', done: 'Done', linkReady: 'Link ready', required: 'Phone and amount are required.',
  },
}

const PROV = {
  MonCash: { color: '#e5322d', short: 'MC' },
  NatCash: { color: '#2563eb', short: 'NC' },
}
const STATUS = {
  pending:   { color: K.orange, icon: <Clock size={11} /> },
  confirmed: { color: K.green,  icon: <CheckCircle size={11} /> },
  failed:    { color: K.red,    icon: <XCircle size={11} /> },
  cancelled: { color: K.muted,  icon: <Ban size={11} /> },
}
const money = (n) => Number(n || 0).toLocaleString('fr-HT')

const MP_STYLES = `
.mp-prov{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mp-prov button{position:relative;height:64px;border-radius:18px;border:1.5px solid var(--border);background:#fff;cursor:pointer;display:flex;align-items:center;gap:12px;padding:0 14px;font:800 16px var(--body);color:var(--muted);transition:all .25s;overflow:hidden}
.mp-prov button .lg{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:800;font-size:16px;color:#fff;background:var(--pc);flex-shrink:0;opacity:.45;transition:opacity .25s}
.mp-prov button.on{border-color:var(--pc);color:var(--ink);box-shadow:0 14px 28px -20px var(--pc)}
.mp-prov button.on .lg{opacity:1}
.mp-prov button .ck{margin-left:auto;color:var(--pc);opacity:0;transition:opacity .2s}
.mp-prov button.on .ck{opacity:1}
.mp-hero-prov{display:flex;gap:8px;flex-wrap:wrap}
.mp-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:820px){.mp-stats{grid-template-columns:1fr 1fr}.mp-stats>*:last-child{grid-column:1/-1}}
.mp-list{display:flex;flex-direction:column;gap:10px}
.mp-tx{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--border);border-radius:20px;padding:14px 16px;flex-wrap:wrap;animation:keIn .45s cubic-bezier(.22,1,.36,1) backwards;transition:box-shadow .25s}
.mp-tx:hover{box-shadow:0 16px 30px -24px rgba(20,21,26,.45)}
.mp-tx .lg{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:800;font-size:17px;color:#fff;background:var(--pc);flex-shrink:0}
.mp-tx .ph{font-family:var(--display);font-weight:800;font-size:20px;line-height:1;color:var(--ink)}
.mp-tx .sub{font-size:12px;color:var(--muted);font-weight:600;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mp-tx .amt{font-family:var(--display);font-weight:800;font-size:24px;line-height:1;white-space:nowrap;text-align:right}
.mp-tx .act{width:40px;height:40px;border-radius:13px;border:0;background:var(--night);color:#4ade80;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s}
.mp-tx .act:hover{transform:translateY(-2px)}
@media(max-width:560px){.mp-tx .right{width:100%;display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px dashed var(--border)}}
.mp-filters{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}
.mp-filters::-webkit-scrollbar{display:none}
.mp-fchip{flex-shrink:0;height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--border);background:#fff;font:700 12.5px var(--body);color:var(--muted);cursor:pointer;transition:all .2s}
.mp-fchip.on{background:var(--night);border-color:var(--night);color:#f2f1ec}
.mp-verify{background:#fff;border:1px solid var(--border);border-radius:24px;padding:20px;max-width:620px}
.mp-kv{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13.5px}
.mp-kv span{color:var(--muted);font-weight:600}.mp-kv b{text-align:right;word-break:break-all}
.mp-link{background:var(--soft);border-radius:14px;padding:12px 14px;font-weight:700;font-size:13px;color:var(--ink);word-break:break-all}
.mp-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;background:var(--soft);border-radius:14px}
.mp-seg button{height:42px;border:0;border-radius:11px;background:transparent;font:700 13px var(--body);color:var(--muted);cursor:pointer}
.mp-seg button.on{background:#fff;color:var(--ink);box-shadow:0 4px 12px -6px rgba(20,21,26,.3)}
`

// ── Modal nouvo demann (2 etap: fòm → lyen) ───────────────────
function PaymentModal({ t, defaultProvider, onClose, onSave, saving }) {
  const [form, setForm] = useState({ provider: defaultProvider || 'MonCash', phone: '', amount: '', description: '' })
  const [link, setLink] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.phone || !form.amount) return toast.error(t.required)
    try {
      const res = await onSave(form)
      const pl = res?.data?.paymentLink
      if (pl) setLink(pl); else onClose()
    } catch { /* toast nan mutation */ }
  }
  const copy = () => navigator.clipboard?.writeText(link).then(() => toast.success(t.copySuccess)).catch(() => {})
  const share = async () => {
    const text = `${form.provider} · ${money(form.amount)} HTG\n${link}`
    if (navigator.share) { try { await navigator.share({ title: t.paymentLink, text }) } catch { /* anile */ } }
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (link) return (
    <Modal onClose={onClose} title={t.linkReady} subtitle={`${form.provider} · ${form.phone}`} icon={<Link2 size={20} />} width={460} dismissible
      footer={<>
        <button className="ke-fbtn" onClick={copy}><Copy size={17} /> {t.copyLink}</button>
        <button className="ke-fbtn main dark" onClick={share}><Share2 size={17} /> {t.share}</button>
      </>}>
      <div className="ke-col" style={{ gap: 14 }}>
        <div style={{ background: K.night, color: '#f2f1ec', borderRadius: 22, padding: 18, textAlign: 'center' }}>
          <span className="ke-eyebrow" style={{ color: '#FFC83D' }}>{t.amount}</span>
          <p style={{ margin: '6px 0 0', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 46, lineHeight: 1, color: '#FFC83D' }}>
            {money(form.amount)}<small style={{ fontSize: 15, color: 'rgba(242,241,236,.55)', marginLeft: 6 }}>HTG</small>
          </p>
        </div>
        <Field label={t.paymentLink}><div className="mp-link">{link}</div></Field>
      </div>
    </Modal>
  )

  return (
    <Modal onClose={onClose} title={t.newRequest} subtitle="MonCash · NatCash" icon={<Smartphone size={20} />} width={480}
      footer={<>
        <button className="ke-fbtn" onClick={onClose}>{t.cancel}</button>
        <button className="ke-fbtn main gold" onClick={submit} disabled={saving}>
          {saving ? <Spinner size={16} /> : <Plus size={17} />} {t.create}
        </button>
      </>}>
      <div className="ke-col" style={{ gap: 14 }}>
        <Field label={`${t.provider} *`}>
          <div className="mp-prov">
            {Object.entries(PROV).map(([p, c]) => (
              <button key={p} className={form.provider === p ? 'on' : ''} style={{ '--pc': c.color }} onClick={() => set('provider', p)}>
                <span className="lg">{c.short}</span>{p}<CheckCircle size={18} className="ck" />
              </button>
            ))}
          </div>
        </Field>
        <Field label={`${t.phone} *`}>
          <input className="ke-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="509-XXXX-XXXX" type="tel" inputMode="tel" />
        </Field>
        <Field label={`${t.amount} (HTG) *`}>
          <input className="ke-input" value={form.amount} onChange={e => set('amount', e.target.value)} type="number" inputMode="decimal" placeholder="0"
            style={{ height: 60, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 30, textAlign: 'center' }} />
        </Field>
        <Field label={t.description}>
          <input className="ke-input" value={form.description} onChange={e => set('description', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal konfigirasyon ───────────────────────────────────────
function ConfigModal({ t, provider, onClose }) {
  const [form, setForm] = useState({ clientKey: '', clientSecret: '', mode: 'sandbox' })
  const [status, setStatus] = useState(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const endpoint = provider === 'MonCash' ? 'moncash' : 'natcash'
  const pc = PROV[provider]

  const handleTest = async () => {
    setTesting(true)
    try { const res = await api.post(`/${endpoint}/test`, form); setStatus(res.data?.connected ? 'connected' : 'disconnected') }
    catch { setStatus('disconnected') }
    setTesting(false)
  }
  const handleSave = async () => {
    setSaving(true)
    try { await api.post(`/${endpoint}/config`, form); toast.success('Konfigirasyon sove!'); onClose() }
    catch { toast.error('Erè sove') }
    setSaving(false)
  }

  return (
    <Modal onClose={onClose} title={provider === 'MonCash' ? t.moncashConfig : t.natcashConfig} subtitle="API" icon={<Settings size={20} />} width={460}
      footer={<>
        <button className="ke-fbtn" onClick={handleTest} disabled={testing}>{testing ? <Spinner size={16} /> : <Wifi size={17} />} {t.testConn}</button>
        <button className="ke-fbtn main dark" onClick={handleSave} disabled={saving}>{saving ? <Spinner size={16} /> : <ShieldCheck size={17} />} {t.saveConfig}</button>
      </>}>
      <div className="ke-col" style={{ gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: hexA(pc.color, .07), border: `1px solid ${hexA(pc.color, .25)}`, borderRadius: 18, padding: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: pc.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18 }}>{pc.short}</div>
          <b style={{ fontSize: 16 }}>{provider}</b>
          {status && <span style={{ marginLeft: 'auto' }}><Chip color={status === 'connected' ? K.green : K.red} icon={status === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}>{t[status]}</Chip></span>}
        </div>
        <Field label={t.clientKey}><input className="ke-input" value={form.clientKey} onChange={e => set('clientKey', e.target.value)} autoComplete="off" /></Field>
        <Field label={t.clientSecret}><input className="ke-input" type="password" value={form.clientSecret} onChange={e => set('clientSecret', e.target.value)} autoComplete="new-password" /></Field>
        <Field label={t.mode}>
          <div className="mp-seg">
            {[{ v: 'sandbox', l: t.sandbox }, { v: 'production', l: t.production }].map(({ v, l }) => (
              <button key={v} className={form.mode === v ? 'on' : ''} onClick={() => set('mode', v)}>{l}</button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

// ── Tab verifye ───────────────────────────────────────────────
function VerifyTab({ t, provider }) {
  const [transId, setTransId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (!transId.trim()) return
    setLoading(true)
    try {
      const endpoint = provider === 'MonCash' ? 'moncash' : 'natcash'
      const res = await api.get(`/${endpoint}/verify/${encodeURIComponent(transId.trim())}`)
      setResult(res.data)
    } catch (err) {
      setResult({ error: true, message: err?.response?.data?.message || 'Tranzaksyon pa jwenn' })
    }
    setLoading(false)
  }

  return (
    <div className="mp-verify ke-in">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="ke-search" style={{ flex: '1 1 220px' }}>
          <Hash size={18} className="lead" />
          <input value={transId} onChange={e => setTransId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerify()} placeholder={t.enterTransId} />
        </div>
        <button className="ke-btn ke-btn-dark" style={{ height: 52 }} onClick={handleVerify} disabled={loading || !transId.trim()}>
          {loading ? <Spinner size={15} /> : <ShieldCheck size={17} />} {t.checkTransaction}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: 16 }}>
          <div className="ke-alert" style={{ '--c': result.error ? K.red : K.green, '--cbg': hexA(result.error ? K.red : K.green, .07), '--cbd': hexA(result.error ? K.red : K.green, .25), margin: 0 }}>
            {result.error ? <XCircle size={17} /> : <CheckCircle size={17} />}
            <div><b>{t.verifyResult}</b>{result.error && <> — {result.message}</>}</div>
          </div>
          {!result.error && (
            <div style={{ marginTop: 8 }}>
              {[
                ['ID', result.transactionId],
                [t.amount, result.amount != null ? `${money(result.amount)} HTG` : null],
                [t.phone, result.payer],
                [t.status, result.status],
                ['Date', result.createdAt ? new Date(result.createdAt).toLocaleString('fr-FR') : null],
                [t.reference, result.reference],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="mp-kv"><span>{k}</span><b>{v}</b></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// KONPOZAN PRENSIPAL
// ══════════════════════════════════════════════
export default function MobilPayPage() {
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'mobilpay-styles'
    el.textContent = KANE_STYLES + MP_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('mobilpay-styles')?.remove()
  }, [])

  const { tenant } = useAuthStore()
  const lang = tenant?.defaultLanguage || 'ht'
  const t = TR[lang] || TR.ht
  const qc = useQueryClient()

  const [tab, setTab] = useState('transactions')
  const [provider, setProvider] = useState('MonCash')
  const [showNewModal, setShowNewModal] = useState(false)
  const [configModal, setConfigModal] = useState(null)
  const [confirmTx, setConfirmTx] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [period, setPeriod] = useState('today')

  const endpoint = provider === 'MonCash' ? 'moncash' : 'natcash'
  const pc = PROV[provider]

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['mobilpay', provider, filter, period],
    queryFn: () => api.get(`/${endpoint}/transactions`, {
      params: { status: filter !== 'all' ? filter : undefined, period },
    }).then(r => r.data),
    retry: 1,
    placeholderData: (prev) => prev,
  })

  const q = search.toLowerCase()
  const transactions = Array.isArray(data?.transactions)
    ? data.transactions.filter(tx => tx && (!q ||
        tx.phone?.includes(search) ||
        tx.reference?.toLowerCase().includes(q) ||
        tx.transactionId?.toLowerCase().includes(q)))
    : []
  const stats = data?.stats || {}

  const createMutation = useMutation({
    mutationFn: (form) => api.post(`/${form.provider === 'MonCash' ? 'moncash' : 'natcash'}/request`, form),
    onSuccess: () => {
      toast.success('Demann kreye!')
      qc.invalidateQueries({ queryKey: ['mobilpay'] })
    },
    onError: err => toast.error(err?.response?.data?.message || 'Erè'),
  })

  const confirmMutation = useMutation({
    mutationFn: (id) => {
      if (!id) throw new Error('ID tranzaksyon manke')
      return api.patch(`/${endpoint}/transactions/${id}/confirm`)
    },
    onSuccess: () => {
      toast.success('Konfime!')
      setConfirmTx(null)
      qc.invalidateQueries({ queryKey: ['mobilpay'] })
    },
    onError: err => toast.error(err?.response?.data?.message || err?.message || 'Erè'),
  })

  const received = Number(stats.totalReceived || 0)
  const pendingAmt = Number(stats.totalPending || 0)

  return (
    <div className="ke-scope ke-page">
      {/* ════════ HERO ════════ */}
      <section className="ke-hero ke-in">
        <div className="ke-hero-glow" />
        <div className="ke-hero-grid" />
        <div className="ke-hero-body" style={{ gridTemplateColumns: '1fr' }}>
          <div style={{ minWidth: 0 }}>
            <div className="ke-hero-top">
              <div className="ke-hero-head">
                <div className="ke-logo"><Smartphone size={26} strokeWidth={2.4} /></div>
                <div style={{ minWidth: 0 }}>
                  <span className="ke-eyebrow"><span className="ke-live" />{todayLabel()}</span>
                  <h1 className="ke-title">{t.title}</h1>
                  <p className="ke-sub">{t.subtitle}</p>
                </div>
              </div>
              <div className="ke-hero-actions">
                <button className="ke-btn ke-btn-glass sq" title="Rafrechi" onClick={() => refetch()}><RefreshCw size={17} className={isFetching ? 'ke-spin' : ''} /></button>
                {Object.keys(PROV).map(p => (
                  <button key={p} className="ke-btn ke-btn-glass" onClick={() => setConfigModal(p)}><Settings size={15} /> {p}</button>
                ))}
                <button className="ke-btn ke-btn-gold ke-hide-sm" onClick={() => setShowNewModal(true)}><Plus size={17} /> {t.newRequest}</button>
              </div>
            </div>
            <div className="ke-hero-bottom" style={{ gridTemplateColumns: '1fr' }}>
              <div>
                <span className="ke-big-l"><Wallet size={14} /> {t.totalReceived} · {provider} · {t[period]}</span>
                <p className="ke-big"><AnimatedNumber value={received} format={money} duration={1300} /><small>HTG</small></p>
                <span className="ke-net" style={{ color: '#FFC83D' }}><Clock size={14} /> {money(pendingAmt)} HTG {t.totalPending.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isError && (
        <div className="ke-alert" style={{ '--c': K.red, '--cbg': hexA(K.red, .07), '--cbd': hexA(K.red, .25), alignItems: 'center' }}>
          <AlertCircle size={17} />
          <div style={{ flex: 1 }}>{t.apiError} — {error?.response?.data?.message || error?.message || '500'}</div>
          <button className="ke-btn ke-btn-soft" style={{ height: 38 }} onClick={() => refetch()}><RefreshCw size={14} /></button>
        </div>
      )}

      {/* Pwovidè */}
      <div className="mp-prov ke-in" style={{ animationDelay: '.05s' }}>
        {Object.entries(PROV).map(([p, c]) => (
          <button key={p} className={provider === p ? 'on' : ''} style={{ '--pc': c.color }} onClick={() => setProvider(p)}>
            <span className="lg">{c.short}</span>{p}<CheckCircle size={18} className="ck" />
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="mp-stats">
        <StatCard label={t.totalReceived} num={received} format={money} suffix="G" icon={<CheckCircle size={21} />} color={K.green}
          pct={received + pendingAmt ? (received / (received + pendingAmt)) * 100 : 0} delay={.08} />
        <StatCard label={t.totalPending} num={pendingAmt} format={money} suffix="G" icon={<Clock size={21} />} color={K.orange}
          pct={received + pendingAmt ? (pendingAmt / (received + pendingAmt)) * 100 : 0} delay={.12} />
        <StatCard label={t.countTx} num={Number(stats.count || 0)} icon={<Phone size={21} />} color={pc.color} pct={100} pill={t[period]} delay={.16} />
      </div>

      {/* Tabs */}
      <div className="ke-toolbar ke-in" style={{ animationDelay: '.2s' }}>
        <div className="ke-tabs" role="tablist" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <span className="ke-tabs-pill" style={{ width: 'calc((100% - 10px)/2)', transform: `translateX(${tab === 'verify' ? 100 : 0}%)` }} />
          <button className={tab === 'transactions' ? 'on' : ''} onClick={() => setTab('transactions')}>{t.newTab}</button>
          <button className={tab === 'verify' ? 'on' : ''} onClick={() => setTab('verify')}>{t.verifyTab}</button>
        </div>
        {tab === 'transactions' && (
          <div className="ke-search">
            <Search size={19} className="lead" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t.phone}, ID...`} />
            {search && <button className="clr" onClick={() => setSearch('')} aria-label="Efase"><X size={15} /></button>}
          </div>
        )}
      </div>

      {tab === 'verify' ? <VerifyTab t={t} provider={provider} /> : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div className="mp-filters">
              {['all', 'pending', 'confirmed', 'failed'].map(s => (
                <button key={s} className={`mp-fchip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>{t[s] || s}</button>
              ))}
            </div>
            <div className="mp-filters">
              {['today', 'week', 'month'].map(p => (
                <button key={p} className={`mp-fchip ${period === p ? 'on' : ''}`} onClick={() => setPeriod(p)}>{t[p]}</button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="mp-list">{[0, 1, 2, 3].map(i => <div key={i} className="ke-skel" style={{ height: 76, borderRadius: 20 }} />)}</div>
          ) : transactions.length === 0 ? (
            <div className="ke-empty ke-in">
              <div className="ke-empty-ic"><Inbox size={28} /></div>
              <h3>{t.noData}</h3>
              <p>{t.subtitle}</p>
              <button className="ke-btn ke-btn-dark" onClick={() => setShowNewModal(true)}><Plus size={17} /> {t.newRequest}</button>
            </div>
          ) : (
            <div className="mp-list">
              {transactions.map((tx, idx) => {
                const st = STATUS[tx.status] || STATUS.pending
                const prov = PROV[tx.provider] || pc
                return (
                  <div key={tx.id ?? `tx-${idx}`} className="mp-tx" style={{ '--pc': prov.color, animationDelay: `${Math.min(idx, 12) * .03}s` }}>
                    <span className="lg">{prov.short}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ph">{tx.phone || '—'}</div>
                      <div className="sub">
                        {tx.transactionId ? `ID ${tx.transactionId}` : tx.reference || ''}{tx.description ? ` · ${tx.description}` : ''}
                      </div>
                    </div>
                    <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div className="amt">{money(tx.amount)} <small style={{ fontSize: 12, color: K.muted }}>HTG</small></div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 }}>
                          <span style={{ fontSize: 11.5, color: K.muted, fontWeight: 600 }}>{new Date(tx.createdAt || Date.now()).toLocaleDateString('fr-FR')}</span>
                          <Chip color={st.color} icon={st.icon}>{t[tx.status] || tx.status}</Chip>
                        </div>
                      </div>
                      {tx.status === 'pending' && (
                        <button className="act" onClick={() => tx?.id ? setConfirmTx(tx) : toast.error('ID tranzaksyon manke')} title={t.manualConfirm}><CheckCircle size={18} /></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <button className="ke-fab" onClick={() => setShowNewModal(true)}><Plus size={20} /> {t.newRequest}</button>

      {showNewModal && (
        <PaymentModal t={t} defaultProvider={provider} saving={createMutation.isPending}
          onClose={() => setShowNewModal(false)} onSave={(form) => createMutation.mutateAsync(form)} />
      )}
      {configModal && <ConfigModal t={t} provider={configModal} onClose={() => setConfigModal(null)} />}
      {confirmTx && (
        <Modal onClose={() => setConfirmTx(null)} title={t.manualConfirm} subtitle={`${confirmTx.provider || provider} · ${confirmTx.phone || ''}`} icon={<CheckCircle size={20} />} width={420}
          footer={<>
            <button className="ke-fbtn" onClick={() => setConfirmTx(null)}>{t.cancel}</button>
            <button className="ke-fbtn main green" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate(confirmTx.id)}>
              {confirmMutation.isPending ? <Spinner size={16} /> : <CheckCircle size={17} />} {t.manualConfirm}
            </button>
          </>}>
          <div className="ke-col" style={{ gap: 12 }}>
            <div style={{ background: K.night, color: '#f2f1ec', borderRadius: 20, padding: 18, textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 44, lineHeight: 1, color: '#FFC83D' }}>
                {money(confirmTx.amount)}<small style={{ fontSize: 14, color: 'rgba(242,241,236,.55)', marginLeft: 5 }}>HTG</small>
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#3a3d48', lineHeight: 1.6 }}>{t.confirmMark}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}