// src/pages/enterprise/SabotayPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Smartphone, Plus, Search, RefreshCw, DollarSign,
  TrendingUp, Package, X, Wifi, WifiOff,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import EnterpriseLock from '../../components/EnterpriseLock'

const T = {
  ht: {
    title: 'Sabotay', subtitle: 'Vant recharge ak vouch elektwonik Sabotay',
    newSale: 'Nouvo Vant', balance: 'Balans Sabotay', checkBalance: 'Verifye Balans',
    totalSales: 'Total Vant', totalProfit: 'Benefis Total', totalTransactions: 'Tranzaksyon',
    phone: 'Nimewo Telefòn', amount: 'Montan', operator: 'Operatè',
    sellingPrice: 'Pri Vant', costPrice: 'Pri Koute', profit: 'Benefis',
    status: 'Statut', pending: 'Annatant', success: 'Reyisi', failed: 'Echwe',
    all: 'Tout', cancel: 'Anile', confirm: 'Konfime Vant',
    noSales: 'Pa gen vant. Kòmanse premye vant ou a!',
    enterPhone: 'Antre nimewo telefòn kliyan', selectOperator: 'Chwazi operatè',
    enterAmount: 'Antre montan recharge', enterSellPrice: 'Pri ou ap vann',
    enterCostPrice: 'Pri Sabotay achte',
    today: 'Jodi a', week: 'Semèn sa a', month: 'Mwa sa a',
    confirmSale: 'Konfime vant sa a?',
    apiConfig: 'Konfigirasyon API Sabotay', apiKey: 'Kle API Sabotay',
    saveConfig: 'Sove Konfigirasyon', testConnection: 'Tès Koneksyon',
    connected: 'Konekte', disconnected: 'Dekonekte',
    apiError: 'Erè koneksyon ak sèvè a.',
  },
  fr: {
    title: 'Sabotay', subtitle: 'Vente de recharges et vouchers électroniques Sabotay',
    newSale: 'Nouvelle Vente', balance: 'Solde Sabotay', checkBalance: 'Vérifier Solde',
    totalSales: 'Total Ventes', totalProfit: 'Bénéfice Total', totalTransactions: 'Transactions',
    phone: 'Numéro de Téléphone', amount: 'Montant', operator: 'Opérateur',
    sellingPrice: 'Prix de Vente', costPrice: 'Prix de Revient', profit: 'Bénéfice',
    status: 'Statut', pending: 'En attente', success: 'Réussi', failed: 'Échoué',
    all: 'Tous', cancel: 'Annuler', confirm: 'Confirmer la Vente',
    noSales: 'Aucune vente. Commencez votre première vente!',
    enterPhone: 'Entrez le numéro du client', selectOperator: "Choisir l'opérateur",
    enterAmount: 'Montant de la recharge', enterSellPrice: 'Prix de vente',
    enterCostPrice: 'Prix Sabotay',
    today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois',
    confirmSale: 'Confirmer cette vente?',
    apiConfig: 'Configuration API Sabotay', apiKey: 'Clé API Sabotay',
    saveConfig: 'Sauvegarder', testConnection: 'Tester la connexion',
    connected: 'Connecté', disconnected: 'Déconnecté',
    apiError: 'Erreur de connexion au serveur.',
  },
  en: {
    title: 'Sabotay', subtitle: 'Electronic recharge and voucher sales via Sabotay',
    newSale: 'New Sale', balance: 'Sabotay Balance', checkBalance: 'Check Balance',
    totalSales: 'Total Sales', totalProfit: 'Total Profit', totalTransactions: 'Transactions',
    phone: 'Phone Number', amount: 'Amount', operator: 'Operator',
    sellingPrice: 'Selling Price', costPrice: 'Cost Price', profit: 'Profit',
    status: 'Status', pending: 'Pending', success: 'Success', failed: 'Failed',
    all: 'All', cancel: 'Cancel', confirm: 'Confirm Sale',
    noSales: 'No sales yet. Start your first sale!',
    enterPhone: 'Enter customer phone number', selectOperator: 'Select operator',
    enterAmount: 'Recharge amount', enterSellPrice: 'Your selling price',
    enterCostPrice: 'Sabotay cost price',
    today: 'Today', week: 'This week', month: 'This month',
    confirmSale: 'Confirm this sale?',
    apiConfig: 'Sabotay API Configuration', apiKey: 'Sabotay API Key',
    saveConfig: 'Save Configuration', testConnection: 'Test Connection',
    connected: 'Connected', disconnected: 'Disconnected',
    apiError: 'Server connection error.',
  }
}

const COLORS = {
  gold: '#C9A84C', card: 'rgba(255,255,255,0.04)', border: 'rgba(201,168,76,0.2)',
  green: '#27ae60', red: '#C0392B',
}

const OPERATORS = ['Digicel', 'Natcom', 'Unitel']

const STATUS_STYLE = {
  pending: { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C' },
  success: { bg: 'rgba(39,174,96,0.15)',  color: '#27ae60' },
  failed:  { bg: 'rgba(192,57,43,0.15)',  color: '#C0392B' },
}

// ── Modal Vant
function SaleModal({ lang, onClose, onSave }) {
  const t = T[lang] || T.ht
  const [form, setForm] = useState({ phone: '', operator: 'Digicel', amount: '', sellingPrice: '', costPrice: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const profit = form.sellingPrice && form.costPrice
    ? (Number(form.sellingPrice) - Number(form.costPrice)).toFixed(2) : null
  const profitColor = profit === null ? '#94a3b8' : Number(profit) >= 0 ? COLORS.green : COLORS.red

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={18} />{t.newSale}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.phone} *</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={t.enterPhone} type="tel"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 15, fontWeight: 700, marginTop: 4,
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.operator} *</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {OPERATORS.map(op => (
                <button key={op} onClick={() => set('operator', op)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `2px solid ${form.operator === op ? COLORS.gold : 'rgba(255,255,255,0.1)'}`,
                  background: form.operator === op ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: form.operator === op ? COLORS.gold : '#94a3b8'
                }}>{op}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.amount} (HTG) *</label>
            <input value={form.amount} onChange={e => set('amount', e.target.value)} placeholder={t.enterAmount} type="number"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 16, fontWeight: 800, marginTop: 4,
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: COLORS.gold, boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.sellingPrice} *</label>
              <input value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} placeholder={t.enterSellPrice} type="number"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
                  background: 'rgba(39,174,96,0.08)', border: `1px solid rgba(39,174,96,0.3)`, color: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.costPrice}</label>
              <input value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder={t.enterCostPrice} type="number"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
                  background: 'rgba(192,57,43,0.08)', border: `1px solid rgba(192,57,43,0.2)`, color: '#fff', boxSizing: 'border-box' }} />
            </div>
          </div>

          {profit !== null && (
            <div style={{ padding: '10px 14px', borderRadius: 8, textAlign: 'center', background: Number(profit) >= 0 ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)', border: `1px solid ${profitColor}30` }}>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{t.profit}: </span>
              <span style={{ color: profitColor, fontWeight: 800, fontSize: 18 }}>{Number(profit) >= 0 ? '+' : ''}{profit} HTG</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>{t.cancel}</button>
          <button onClick={() => {
            if (!form.phone || !form.amount || !form.sellingPrice) return toast.error('Telefòn, montan, ak pri vant obligatwa.')
            if (!window.confirm(t.confirmSale)) return
            onSave(form)
          }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`, color: '#000', fontWeight: 700 }}>{t.confirm}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Konfigirasyon API
function ApiConfigModal({ lang, onClose }) {
  const t = T[lang] || T.ht
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState(null)

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await api.post('/sabotay/test-connection', { apiKey })
      setStatus(res.data?.connected ? 'connected' : 'disconnected')
    } catch { setStatus('disconnected') }
    setTesting(false)
  }

  const handleSave = async () => {
    try {
      await api.post('/sabotay/config', { apiKey })
      toast.success('Konfigirasyon sove!')
      onClose()
    } catch { toast.error('Erè sove konfigirasyon') }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: 0 }}>{t.apiConfig}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.apiKey}</label>
        <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginTop: 6, marginBottom: 14,
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }} />
        {status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: status === 'connected' ? COLORS.green : COLORS.red }}>
            {status === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
            {t[status]}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleTest} disabled={testing || !apiKey} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${COLORS.border}`, background: 'transparent', color: '#94a3b8' }}>
            {testing ? '...' : t.testConnection}
          </button>
          <button onClick={handleSave} disabled={!apiKey} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`, color: '#000', fontWeight: 700 }}>
            {t.saveConfig}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// KONPOZAN PRENSIPAL
// ══════════════════════════════════════════════
export default function SabotayPage() {
  const { tenant } = useAuthStore()
  const lang = tenant?.defaultLanguage || 'ht'
  const t = T[lang] || T.ht
  const qc = useQueryClient()

  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('today')

  // ✅ KORIJE — case-insensitive
  const planName = tenant?.plan?.name || ''
  const isEnterprise = ['antepriz', 'antrepriz', 'entreprise', 'enterprise']
    .includes(planName.toLowerCase().trim())

  // ✅ Si pa Enterprise, montre lock
  if (!isEnterprise) return (
    <EnterpriseLock lang={lang} page="sabotay" currentPlanName={planName} />
  )

  // ✅ KORIJE — retire onError, ajoute placeholderData (React Query v5)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sabotay-sales', filter, period],
    queryFn: () => api.get('/sabotay/sales', {
      params: { status: filter !== 'all' ? filter : undefined, period }
    }).then(r => r.data),
    retry: 1,
    placeholderData: { sales: [], stats: {}, balance: null },
  })

  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ['sabotay-balance'],
    queryFn: () => api.get('/sabotay/balance').then(r => r.data),
    retry: 1,
    placeholderData: { balance: null },
  })

  // ✅ Pwoteksyon null
  const sales = Array.isArray(data?.sales)
    ? data.sales.filter(s =>
        !s ? false :
        !search ||
        s.phone?.includes(search) ||
        s.operator?.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const stats = data?.stats || {}

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/sabotay/sales', form),
    onSuccess: () => {
      toast.success('Vant reyisi!')
      // ✅ React Query v5 syntax
      qc.invalidateQueries({ queryKey: ['sabotay-sales'] })
      qc.invalidateQueries({ queryKey: ['sabotay-balance'] })
      setShowSaleModal(false)
    },
    onError: err => toast.error(err?.response?.data?.message || 'Erè vant')
  })

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: COLORS.gold, margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={22} />{t.title}
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowConfigModal(true)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>⚙ API</button>
          <button onClick={() => refetch()} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><RefreshCw size={14} /></button>
          <button onClick={() => setShowSaleModal(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`,
            color: '#000', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
          }}><Plus size={15} />{t.newSale}</button>
        </div>
      </div>

      {/* ✅ Erè API */}
      {isError && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', color: '#C0392B', fontSize: 13 }}>
          ⚠️ {t.apiError} — {error?.response?.data?.message || error?.message || '500'}
        </div>
      )}

      {/* Balans */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(27,58,107,0.3))',
        border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '18px 24px',
        marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{t.balance}</div>
          <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 28 }}>
            {balanceData?.balance != null
              ? `${Number(balanceData.balance).toLocaleString('fr-HT')} HTG`
              : '— HTG'}
          </div>
        </div>
        <button onClick={refetchBalance} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
          {t.checkBalance}
        </button>
      </div>

      {/* Statistik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: t.totalSales,        val: `${Number(stats.totalSales || 0).toLocaleString('fr-HT')} HTG`, icon: <DollarSign size={14} />, color: '#fff' },
          { label: t.totalProfit,       val: `+${Number(stats.totalProfit || 0).toLocaleString('fr-HT')} HTG`, icon: <TrendingUp size={14} />, color: COLORS.green },
          { label: t.totalTransactions, val: stats.count || 0, icon: <Package size={14} />, color: COLORS.gold },
        ].map(({ label, val, icon, color }) => (
          <div key={label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ color, fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{icon}{val}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t.phone}...`}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, fontSize: 13, background: COLORS.card, border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }} />
        </div>
        {['all', 'pending', 'success', 'failed'].map(s => (
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

      {/* Lis vant */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Chajman...</div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60, background: COLORS.card, borderRadius: 12, border: `1px dashed ${COLORS.border}` }}>
          <Smartphone size={40} color="#334155" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>{t.noSales}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sales.map((sale, idx) => {
            // ✅ Skip si sale null/undefined
            if (!sale) return null
            const ss = STATUS_STYLE[sale.status] || STATUS_STYLE.pending
            const profit = sale.sellingPrice && sale.costPrice
              ? Number(sale.sellingPrice) - Number(sale.costPrice) : null
            return (
              // ✅ Kle sekirize
              <div key={sale.id ?? `sale-${idx}`} style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }}>
                <div style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(201,168,76,0.12)', color: COLORS.gold, minWidth: 64, textAlign: 'center' }}>
                  {sale.operator || '—'}
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{sale.phone || '—'}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>
                    {sale.createdAt ? new Date(sale.createdAt).toLocaleString('fr-FR') : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 90 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{Number(sale.amount || 0).toLocaleString('fr-HT')} HTG</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{t.amount}</div>
                </div>
                {profit !== null && (
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ color: profit >= 0 ? COLORS.green : COLORS.red, fontWeight: 700, fontSize: 14 }}>
                      {profit >= 0 ? '+' : ''}{profit.toLocaleString('fr-HT')}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{t.profit}</div>
                  </div>
                )}
                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color }}>
                  {t[sale.status] || sale.status}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {showSaleModal && <SaleModal lang={lang} onClose={() => setShowSaleModal(false)} onSave={(form) => createMutation.mutate(form)} />}
      {showConfigModal && <ApiConfigModal lang={lang} onClose={() => setShowConfigModal(false)} />}
    </div>
  )
}
