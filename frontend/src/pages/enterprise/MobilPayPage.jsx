// src/pages/enterprise/MobilPayPage.jsx
// ============================================================
// PLUS GROUP — MonCash & NatCash (Plan Antepriz sèlman)
// Jesyon peman mobil, verifikasyon tranzaksyon, reçu
// 3 Lang: ht | fr | en
// ============================================================
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Phone, Plus, Search, RefreshCw, CheckCircle,
  XCircle, Clock, DollarSign, TrendingUp, Copy,
  X, Wifi, WifiOff, AlertTriangle, ExternalLink
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import EnterpriseLock from '../../components/EnterpriseLock'

// ── Tradiksyon
const T = {
  ht: {
    title: 'MonCash & NatCash',
    subtitle: 'Resevwa peman mobil ak verifye tranzaksyon',
    newRequest: 'Nouvo Demann',
    newTab: 'Tranzaksyon',
    verifyTab: 'Verifye',
    statsTab: 'Rapò',
    amount: 'Montan',
    phone: 'Nimewo Telefòn',
    provider: 'Pwovide',
    description: 'Deskripsyon',
    reference: 'Referans',
    status: 'Statut',
    pending: 'Annatant',
    confirmed: 'Konfime',
    failed: 'Echwe',
    cancelled: 'Anile',
    cancel: 'Anile',
    create: 'Kreye Demann',
    verify: 'Verifye',
    transactionId: 'ID Tranzaksyon',
    enterTransId: 'Antre ID tranzaksyon an',
    checkTransaction: 'Verifye Tranzaksyon',
    verifyResult: 'Rezilta Verifikasyon',
    noData: 'Pa gen tranzaksyon.',
    enterpriseOnly: 'Fonksyon sa a disponib sèlman pou Plan Antepriz.',
    copyLink: 'Kopye Lyen',
    paymentLink: 'Lyen Peman',
    generateLink: 'Jenere Lyen',
    totalReceived: 'Total Resevwa',
    totalPending: 'Annatant',
    countTx: 'Tranzaksyon',
    today: 'Jodi a',
    week: 'Semèn sa a',
    month: 'Mwa sa a',
    moncashConfig: 'Konfigirasyon MonCash',
    natcashConfig: 'Konfigirasyon NatCash',
    clientKey: 'Client Key',
    clientSecret: 'Client Secret',
    mode: 'Mode',
    sandbox: 'Sandbox (Tès)',
    production: 'Production',
    saveConfig: 'Sove',
    testConn: 'Tès Koneksyon',
    connected: 'Konekte',
    disconnected: 'Dekonekte',
    confirmMark: 'Konfime tranzaksyon sa a manyèlman?',
    manualConfirm: 'Konfime Manyèl',
    copySuccess: 'Kopye!',
    currency: 'HTG',
  },
  fr: {
    title: 'MonCash & NatCash',
    subtitle: 'Recevez des paiements mobiles et vérifiez les transactions',
    newRequest: 'Nouvelle Demande',
    newTab: 'Transactions',
    verifyTab: 'Vérifier',
    statsTab: 'Rapport',
    amount: 'Montant',
    phone: 'Numéro de Téléphone',
    provider: 'Fournisseur',
    description: 'Description',
    reference: 'Référence',
    status: 'Statut',
    pending: 'En attente',
    confirmed: 'Confirmé',
    failed: 'Échoué',
    cancelled: 'Annulé',
    cancel: 'Annuler',
    create: 'Créer Demande',
    verify: 'Vérifier',
    transactionId: 'ID Transaction',
    enterTransId: "Entrez l'ID de transaction",
    checkTransaction: 'Vérifier Transaction',
    verifyResult: 'Résultat de Vérification',
    noData: 'Aucune transaction.',
    enterpriseOnly: 'Cette fonctionnalité est disponible uniquement pour le Plan Entreprise.',
    copyLink: 'Copier Lien',
    paymentLink: 'Lien de Paiement',
    generateLink: 'Générer Lien',
    totalReceived: 'Total Reçu',
    totalPending: 'En attente',
    countTx: 'Transactions',
    today: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois',
    moncashConfig: 'Configuration MonCash',
    natcashConfig: 'Configuration NatCash',
    clientKey: 'Client Key',
    clientSecret: 'Client Secret',
    mode: 'Mode',
    sandbox: 'Sandbox (Test)',
    production: 'Production',
    saveConfig: 'Sauvegarder',
    testConn: 'Tester',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    confirmMark: 'Confirmer cette transaction manuellement?',
    manualConfirm: 'Confirmation Manuelle',
    copySuccess: 'Copié!',
    currency: 'HTG',
  },
  en: {
    title: 'MonCash & NatCash',
    subtitle: 'Receive mobile payments and verify transactions',
    newRequest: 'New Request',
    newTab: 'Transactions',
    verifyTab: 'Verify',
    statsTab: 'Report',
    amount: 'Amount',
    phone: 'Phone Number',
    provider: 'Provider',
    description: 'Description',
    reference: 'Reference',
    status: 'Status',
    pending: 'Pending',
    confirmed: 'Confirmed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    cancel: 'Cancel',
    create: 'Create Request',
    verify: 'Verify',
    transactionId: 'Transaction ID',
    enterTransId: 'Enter transaction ID',
    checkTransaction: 'Check Transaction',
    verifyResult: 'Verification Result',
    noData: 'No transactions yet.',
    enterpriseOnly: 'This feature is available only for the Enterprise Plan.',
    copyLink: 'Copy Link',
    paymentLink: 'Payment Link',
    generateLink: 'Generate Link',
    totalReceived: 'Total Received',
    totalPending: 'Pending',
    countTx: 'Transactions',
    today: 'Today',
    week: 'This week',
    month: 'This month',
    moncashConfig: 'MonCash Configuration',
    natcashConfig: 'NatCash Configuration',
    clientKey: 'Client Key',
    clientSecret: 'Client Secret',
    mode: 'Mode',
    sandbox: 'Sandbox (Test)',
    production: 'Production',
    saveConfig: 'Save',
    testConn: 'Test Connection',
    connected: 'Connected',
    disconnected: 'Disconnected',
    confirmMark: 'Manually confirm this transaction?',
    manualConfirm: 'Manual Confirm',
    copySuccess: 'Copied!',
    currency: 'HTG',
  }
}

const COLORS = {
  gold: '#C9A84C', card: 'rgba(255,255,255,0.04)', border: 'rgba(201,168,76,0.2)',
  green: '#27ae60', red: '#C0392B', blue: '#2980b9',
  moncash: '#e53e3e', natcash: '#2b6cb0'
}

const PROVIDER_COLORS = {
  MonCash: { bg: 'rgba(229,62,62,0.15)', color: '#e53e3e', dot: '#e53e3e' },
  NatCash: { bg: 'rgba(43,108,176,0.15)', color: '#63b3ed', dot: '#63b3ed' },
}

const STATUS_STYLE = {
  pending:   { bg: 'rgba(201,168,76,0.15)',  color: '#C9A84C' },
  confirmed: { bg: 'rgba(39,174,96,0.15)',   color: '#27ae60' },
  failed:    { bg: 'rgba(192,57,43,0.15)',   color: '#C0392B' },
  cancelled: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
}

// ── Modal Nouvo Demann Peman
function PaymentModal({ lang, onClose, onSave }) {
  const t = T[lang] || T.ht
  const [form, setForm] = useState({
    provider: 'MonCash', phone: '', amount: '', description: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [generatedLink, setGeneratedLink] = useState(null)

  const handleCreate = () => {
    if (!form.phone || !form.amount) return toast.error('Telefòn ak montan obligatwa.')
    onSave(form, (link) => {
      if (link) setGeneratedLink(link)
    })
  }

  const copyLink = () => {
    if (!generatedLink) return
    navigator.clipboard.writeText(generatedLink)
    toast.success(t.copySuccess)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: '#0f172a', border: `1px solid ${COLORS.border}`,
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 440
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={18} />{t.newRequest}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Pwovide Chwazi */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.provider} *</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {['MonCash', 'NatCash'].map(p => {
              const pc = PROVIDER_COLORS[p]
              return (
                <button key={p} onClick={() => set('provider', p)} style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  border: `2px solid ${form.provider === p ? pc.color : 'rgba(255,255,255,0.1)'}`,
                  background: form.provider === p ? pc.bg : 'transparent',
                  color: form.provider === p ? pc.color : '#94a3b8',
                  transition: 'all 0.2s'
                }}>{p}</button>
              )
            })}
          </div>
        </div>

        {/* Telefòn */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.phone} *</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="509-XXXX-XXXX" type="tel"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 15, fontWeight: 700, marginTop: 4,
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        {/* Montan */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.amount} (HTG) *</label>
          <input value={form.amount} onChange={e => set('amount', e.target.value)}
            type="number" placeholder="0.00"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 22, fontWeight: 800, marginTop: 4,
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: COLORS.gold, boxSizing: 'border-box' }}
          />
        </div>

        {/* Deskripsyon */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.description}</label>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        {/* Lyen Jenere */}
        {generatedLink && (
          <div style={{
            marginBottom: 14, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.3)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{t.paymentLink}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {generatedLink}
              </span>
              <button onClick={copyLink} style={{
                padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: COLORS.green, color: '#fff', fontSize: 11
              }}><Copy size={11} /></button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600
          }}>{t.cancel}</button>
          <button onClick={handleCreate} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`, color: '#000', fontWeight: 700
          }}>{t.create}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Konfigirasyon (MonCash oswa NatCash)
function ConfigModal({ lang, provider, onClose }) {
  const t = T[lang] || T.ht
  const [form, setForm] = useState({ clientKey: '', clientSecret: '', mode: 'sandbox' })
  const [status, setStatus] = useState(null)
  const [testing, setTesting] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const endpoint = provider === 'MonCash' ? 'moncash' : 'natcash'
  const title = provider === 'MonCash' ? t.moncashConfig : t.natcashConfig
  const pc = PROVIDER_COLORS[provider]

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await api.post(`/${endpoint}/test`, form)
      setStatus(res.data?.connected ? 'connected' : 'disconnected')
    } catch { setStatus('disconnected') }
    setTesting(false)
  }

  const handleSave = async () => {
    try {
      await api.post(`/${endpoint}/config`, form)
      toast.success('Konfigirasyon sove!')
      onClose()
    } catch { toast.error('Erè sove') }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16
    }}>
      <div style={{
        background: '#0f172a', border: `1px solid ${pc.color}40`,
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 400
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: pc.color, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        {[{ k: 'clientKey', label: t.clientKey }, { k: 'clientSecret', label: t.clientSecret }].map(({ k, label }) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={{ color: '#94a3b8', fontSize: 12 }}>{label}</label>
            <input value={form[k]} onChange={e => set(k, e.target.value)} type={k === 'clientSecret' ? 'password' : 'text'}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${pc.color}40`, color: '#fff', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.mode}</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {[{ v: 'sandbox', l: t.sandbox }, { v: 'production', l: t.production }].map(({ v, l }) => (
              <button key={v} onClick={() => set('mode', v)} style={{
                flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                border: `1px solid ${form.mode === v ? pc.color : 'rgba(255,255,255,0.1)'}`,
                background: form.mode === v ? `${pc.color}20` : 'transparent',
                color: form.mode === v ? pc.color : '#64748b'
              }}>{l}</button>
            ))}
          </div>
        </div>
        {status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            color: status === 'connected' ? COLORS.green : COLORS.red }}>
            {status === 'connected' ? <Wifi size={15} /> : <WifiOff size={15} />}
            {t[status]}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleTest} disabled={testing} style={{
            flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${pc.color}40`, background: 'transparent', color: '#94a3b8', fontSize: 12
          }}>{testing ? '...' : t.testConn}</button>
          <button onClick={handleSave} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: pc.color, color: '#fff', fontWeight: 700
          }}>{t.saveConfig}</button>
        </div>
      </div>
    </div>
  )
}

// ── Tab Verifye Tranzaksyon
function VerifyTab({ lang, provider }) {
  const t = T[lang] || T.ht
  const [transId, setTransId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (!transId.trim()) return
    setLoading(true)
    try {
      const endpoint = provider === 'MonCash' ? 'moncash' : 'natcash'
      const res = await api.get(`/${endpoint}/verify/${transId.trim()}`)
      setResult(res.data)
    } catch (err) {
      setResult({ error: true, message: err.response?.data?.message || 'Tranzaksyon pa jwenn' })
    }
    setLoading(false)
  }

  const pc = PROVIDER_COLORS[provider]

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input value={transId} onChange={e => setTransId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder={t.enterTransId}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 14,
            background: COLORS.card, border: `1px solid ${COLORS.border}`, color: '#fff' }}
        />
        <button onClick={handleVerify} disabled={loading || !transId.trim()} style={{
          padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: pc.color, color: '#fff', fontWeight: 700, fontSize: 13
        }}>{loading ? '...' : t.checkTransaction}</button>
      </div>

      {result && (
        <div style={{
          padding: 20, borderRadius: 12,
          background: result.error ? 'rgba(192,57,43,0.1)' : 'rgba(39,174,96,0.1)',
          border: `1px solid ${result.error ? COLORS.red : COLORS.green}40`
        }}>
          <div style={{ fontWeight: 700, color: result.error ? COLORS.red : COLORS.green, marginBottom: 12, fontSize: 15 }}>
            {result.error ? '❌ ' : '✅ '}{t.verifyResult}
          </div>
          {result.error ? (
            <p style={{ color: '#94a3b8', margin: 0 }}>{result.message}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['ID', result.transactionId],
                [t.amount, `${Number(result.amount || 0).toLocaleString('fr-HT')} HTG`],
                [t.phone, result.payer],
                [t.status, result.status],
                ['Date', result.createdAt ? new Date(result.createdAt).toLocaleString('fr-FR') : '—'],
                [t.reference, result.reference],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{k}</span>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{v}</span>
                </div>
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
  const { tenant } = useAuthStore()
  const lang = tenant?.defaultLanguage || 'ht'
  const t = T[lang] || T.ht
  const qc = useQueryClient()

  const [tab, setTab] = useState('transactions')
  const [provider, setProvider] = useState('MonCash')
  const [showNewModal, setShowNewModal] = useState(false)
  const [configModal, setConfigModal] = useState(null) // 'MonCash' | 'NatCash' | null
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [period, setPeriod] = useState('today')

  const planName = tenant?.plan?.name || ''
const isEnterprise = ['antepriz', 'antrepriz', 'entreprise', 'enterprise']
  .includes(planName.toLowerCase().trim())

  const endpoint = provider === 'MonCash' ? 'moncash' : 'natcash'
  const pc = PROVIDER_COLORS[provider]

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mobilpay', provider, filter, period],
    queryFn: () => api.get(`/${endpoint}/transactions`, { params: { status: filter !== 'all' ? filter : undefined, period } })
      .then(r => r.data),
    onError: () => ({ transactions: [], stats: {} })
  })

  const transactions = (data?.transactions || []).filter(tx =>
    !search || tx.phone?.includes(search) || tx.reference?.toLowerCase().includes(search.toLowerCase()) ||
    tx.transactionId?.toLowerCase().includes(search.toLowerCase())
  )
  const stats = data?.stats || {}

  const createMutation = useMutation({
    mutationFn: (form) => api.post(`/${endpoint}/request`, form),
    onSuccess: (res) => {
      toast.success('Demann kreye!')
      qc.invalidateQueries(['mobilpay'])
      const paymentLink = res.data?.paymentLink
      if (paymentLink) {
        // pase link ba modal pou montre
        setShowNewModal(false)
        // ko montre lyen nan toast
        toast((tk) => (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Lyen Peman:</div>
            <a href={paymentLink} target="_blank" rel="noreferrer"
              style={{ color: COLORS.gold, fontSize: 12, wordBreak: 'break-all' }}>{paymentLink}</a>
          </div>
        ), { duration: 8000 })
      } else {
        setShowNewModal(false)
      }
    },
    onError: err => toast.error(err.response?.data?.message || 'Erè')
  })

  const confirmMutation = useMutation({
    mutationFn: (id) => api.patch(`/${endpoint}/transactions/${id}/confirm`),
    onSuccess: () => { toast.success('Konfime!'); qc.invalidateQueries(['mobilpay']) },
    onError: err => toast.error(err.response?.data?.message || 'Erè')
  })

  const handleConfirm = (tx) => {
    if (window.confirm(t.confirmMark)) confirmMutation.mutate(tx.id)
  }

  return (
    <div style={{ padding: '24px', maxWidth: 920, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: COLORS.gold, margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={22} />{t.title}
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Config bouton */}
          {['MonCash', 'NatCash'].map(p => (
            <button key={p} onClick={() => setConfigModal(p)} style={{
              padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
              border: `1px solid ${PROVIDER_COLORS[p].color}40`,
              background: 'transparent', color: PROVIDER_COLORS[p].color
            }}>⚙ {p}</button>
          ))}
          <button onClick={() => refetch()} style={{
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: 'transparent', color: '#94a3b8', cursor: 'pointer'
          }}><RefreshCw size={14} /></button>
          <button onClick={() => setShowNewModal(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`,
            color: '#000', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
          }}><Plus size={15} />{t.newRequest}</button>
        </div>
      </div>

      {/* Pwovide Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['MonCash', 'NatCash'].map(p => {
          const c = PROVIDER_COLORS[p]
          return (
            <button key={p} onClick={() => setProvider(p)} style={{
              flex: 1, maxWidth: 180, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15,
              border: `2px solid ${provider === p ? c.color : 'rgba(255,255,255,0.1)'}`,
              background: provider === p ? c.bg : 'transparent',
              color: provider === p ? c.color : '#64748b', transition: 'all 0.2s'
            }}>{p}</button>
          )
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: t.totalReceived, val: `${Number(stats.totalReceived || 0).toLocaleString('fr-HT')} HTG`, color: COLORS.green },
          { label: t.totalPending,  val: `${Number(stats.totalPending  || 0).toLocaleString('fr-HT')} HTG`, color: COLORS.gold },
          { label: t.countTx,       val: stats.count || 0, color: '#fff' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: 16, textAlign: 'center'
          }}>
            <div style={{ color, fontWeight: 800, fontSize: 18 }}>{val}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
        {[
          { id: 'transactions', label: t.newTab },
          { id: 'verify', label: t.verifyTab },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 700 : 400,
            background: 'transparent', color: tab === id ? COLORS.gold : '#64748b',
            borderBottom: tab === id ? `2px solid ${COLORS.gold}` : '2px solid transparent',
            marginBottom: -1
          }}>{label}</button>
        ))}
      </div>

      {tab === 'verify' ? (
        <VerifyTab lang={lang} provider={provider} />
      ) : (
        <>
          {/* Filtri */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t.phone}...`}
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, fontSize: 13,
                  background: COLORS.card, border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            {['all', 'pending', 'confirmed', 'failed'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: filter === s ? 700 : 400,
                border: `1px solid ${filter === s ? COLORS.gold : 'rgba(255,255,255,0.1)'}`,
                background: filter === s ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: filter === s ? COLORS.gold : '#64748b'
              }}>{t[s] || s}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {['today', 'week', 'month'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '6px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${period === p ? COLORS.gold : 'rgba(255,255,255,0.1)'}`,
                  background: period === p ? 'rgba(201,168,76,0.1)' : 'transparent',
                  color: period === p ? COLORS.gold : '#64748b'
                }}>{t[p]}</button>
              ))}
            </div>
          </div>

          {/* Lis tranzaksyon */}
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Chajman...</div>
          ) : transactions.length === 0 ? (
            <div style={{
              textAlign: 'center', color: '#64748b', padding: 60,
              background: COLORS.card, borderRadius: 12, border: `1px dashed ${COLORS.border}`
            }}>
              <Phone size={40} color="#334155" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0 }}>{t.noData}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map(tx => {
                const ss = STATUS_STYLE[tx.status] || STATUS_STYLE.pending
                const prov = PROVIDER_COLORS[tx.provider] || pc
                return (
                  <div key={tx.id} style={{
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                  }}>
                    {/* Pwovide */}
                    <span style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: prov.bg, color: prov.color, minWidth: 72, textAlign: 'center'
                    }}>{tx.provider || provider}</span>

                    {/* Telefòn */}
                    <div style={{ flex: 1, minWidth: 110 }}>
                      <div style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>
                        {tx.phone || '—'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>
                        {tx.transactionId ? `ID: ${tx.transactionId.substring(0, 12)}...` : tx.reference || ''}
                      </div>
                    </div>

                    {/* Deskripsyon */}
                    {tx.description && (
                      <div style={{ color: '#94a3b8', fontSize: 12, flex: 1, minWidth: 100 }}>{tx.description}</div>
                    )}

                    {/* Montan */}
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>
                        {Number(tx.amount || 0).toLocaleString('fr-HT')} HTG
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>
                        {new Date(tx.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                      </div>
                    </div>

                    {/* Statut */}
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: ss.bg, color: ss.color
                    }}>{t[tx.status] || tx.status}</span>

                    {/* Aksyon */}
                    {tx.status === 'pending' && (
                      <button onClick={() => handleConfirm(tx)} title={t.manualConfirm} style={{
                        padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: 'rgba(39,174,96,0.15)', color: COLORS.green, fontSize: 11, fontWeight: 700
                      }}><CheckCircle size={13} /></button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showNewModal && (
        <PaymentModal lang={lang} onClose={() => setShowNewModal(false)}
          onSave={(form, cb) => createMutation.mutate(form)} />
      )}
      {configModal && (
        <ConfigModal lang={lang} provider={configModal} onClose={() => setConfigModal(null)} />
      )}
    </div>
  )
}
