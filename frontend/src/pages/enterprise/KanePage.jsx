// src/pages/enterprise/KanePage.jsx
// ============================================================
// PLUS GROUP — Ti Kanè Kès (Plan Antepriz sèlman)
// Jesyon nòt kès, rekèt lajan, reçu rapid
// 3 Lang: ht | fr | en
// ============================================================
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CreditCard, Plus, Printer, Search, Filter,
  CheckCircle, XCircle, Clock, DollarSign,
  FileText, X, ChevronDown, Download, RefreshCw
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import EnterpriseLock from '../../components/EnterpriseLock'

// ── Tradiksyon
const T = {
  ht: {
    title: 'Ti Kanè Kès',
    subtitle: 'Rekèt lajan rapid ak reçu kès',
    newKane: 'Nouvo Kanè',
    search: 'Chèche...',
    all: 'Tout',
    pending: 'Annatant',
    paid: 'Peye',
    cancelled: 'Anile',
    amount: 'Montan',
    description: 'Deskripsyon',
    currency: 'Monè',
    clientName: 'Non Kliyan',
    clientPhone: 'Telefòn Kliyan',
    notes: 'Nòt',
    create: 'Kreye Kanè',
    cancel: 'Anile',
    print: 'Enprime',
    markPaid: 'Mete Peye',
    markCancelled: 'Anile Kanè',
    noKane: 'Pa gen kanè. Kreye premye kanè ou a!',
    kaneNum: 'Nimewo',
    date: 'Dat',
    status: 'Statut',
    actions: 'Aksyon',
    totalToday: 'Total Jodi a',
    totalPaid: 'Total Peye',
    totalPending: 'Annatant',
    enterpriseOnly: 'Fonksyon sa a disponib sèlman pou Plan Antepriz.',
    confirmPaid: 'Mete kanè sa a kòm peye?',
    confirmCancel: 'Anile kanè sa a?',
    receiptTitle: 'REÇU KÈS',
    receiptCashier: 'Kasye',
    receiptTotal: 'TOTAL',
    receiptThanks: 'Mèsi pou achte ou!',
  },
  fr: {
    title: 'Petit Bon de Caisse',
    subtitle: 'Demandes de paiement rapide et reçus de caisse',
    newKane: 'Nouveau Bon',
    search: 'Rechercher...',
    all: 'Tous',
    pending: 'En attente',
    paid: 'Payé',
    cancelled: 'Annulé',
    amount: 'Montant',
    description: 'Description',
    currency: 'Devise',
    clientName: 'Nom du Client',
    clientPhone: 'Téléphone',
    notes: 'Notes',
    create: 'Créer Bon',
    cancel: 'Annuler',
    print: 'Imprimer',
    markPaid: 'Marquer Payé',
    markCancelled: 'Annuler Bon',
    noKane: 'Aucun bon. Créez votre premier bon!',
    kaneNum: 'Numéro',
    date: 'Date',
    status: 'Statut',
    actions: 'Actions',
    totalToday: "Total Aujourd'hui",
    totalPaid: 'Total Payé',
    totalPending: 'En attente',
    enterpriseOnly: 'Cette fonctionnalité est disponible uniquement pour le Plan Entreprise.',
    confirmPaid: 'Marquer ce bon comme payé?',
    confirmCancel: 'Annuler ce bon?',
    receiptTitle: 'REÇU DE CAISSE',
    receiptCashier: 'Caissier',
    receiptTotal: 'TOTAL',
    receiptThanks: 'Merci pour votre achat!',
  },
  en: {
    title: 'Cash Voucher',
    subtitle: 'Quick payment requests and cash receipts',
    newKane: 'New Voucher',
    search: 'Search...',
    all: 'All',
    pending: 'Pending',
    paid: 'Paid',
    cancelled: 'Cancelled',
    amount: 'Amount',
    description: 'Description',
    currency: 'Currency',
    clientName: 'Client Name',
    clientPhone: 'Phone',
    notes: 'Notes',
    create: 'Create Voucher',
    cancel: 'Cancel',
    print: 'Print',
    markPaid: 'Mark Paid',
    markCancelled: 'Cancel Voucher',
    noKane: 'No vouchers yet. Create your first one!',
    kaneNum: 'Number',
    date: 'Date',
    status: 'Status',
    actions: 'Actions',
    totalToday: 'Today Total',
    totalPaid: 'Total Paid',
    totalPending: 'Pending',
    enterpriseOnly: 'This feature is available only for the Enterprise Plan.',
    confirmPaid: 'Mark this voucher as paid?',
    confirmCancel: 'Cancel this voucher?',
    receiptTitle: 'CASH RECEIPT',
    receiptCashier: 'Cashier',
    receiptTotal: 'TOTAL',
    receiptThanks: 'Thank you for your purchase!',
  }
}

const COLORS = {
  gold: '#C9A84C', red: '#8B0000', navy: '#1B3A6B',
  dark: '#0a0a0f', card: 'rgba(255,255,255,0.04)',
  border: 'rgba(201,168,76,0.2)',
}

const STATUS_STYLE = {
  pending:   { bg: 'rgba(201,168,76,0.15)',  color: '#C9A84C', label: '⏳' },
  paid:      { bg: 'rgba(39,174,96,0.15)',   color: '#27ae60', label: '✅' },
  cancelled: { bg: 'rgba(192,57,43,0.15)',   color: '#C0392B', label: '❌' },
}

// ── Fonksyon enprime reçu
function printKane(kane, tenant, t) {
  const w = window.open('', '_blank', 'width=320,height=500')
  const date = new Date(kane.createdAt).toLocaleDateString('fr-FR')
  const time = new Date(kane.createdAt).toLocaleTimeString('fr-FR')
  const amount = Number(kane.amount).toLocaleString('fr-HT')
  const currency = kane.currency || 'HTG'

  w.document.write(`
    <html><head><title>Reçu</title>
    <style>
      body { font-family: monospace; font-size: 13px; padding: 10px; max-width: 280px; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .line { border-top: 1px dashed #000; margin: 8px 0; }
      .total { font-size: 18px; font-weight: bold; }
      .row { display: flex; justify-content: space-between; margin: 4px 0; }
    </style></head><body>
    <div class="center bold" style="font-size:16px">${tenant?.name || 'PLUS GROUP'}</div>
    <div class="center" style="font-size:11px">${tenant?.address || ''}</div>
    <div class="center" style="font-size:11px">${tenant?.phone || ''}</div>
    <div class="line"></div>
    <div class="center bold">${t.receiptTitle}</div>
    <div class="center" style="font-size:11px">#${kane.kaneNumber}</div>
    <div class="center" style="font-size:11px">${date} ${time}</div>
    <div class="line"></div>
    <div class="row"><span>${t.clientName}:</span><span>${kane.clientName || '—'}</span></div>
    <div class="row"><span>${t.clientPhone}:</span><span>${kane.clientPhone || '—'}</span></div>
    <div class="line"></div>
    <div class="row"><span class="bold">${kane.description}</span></div>
    <div class="line"></div>
    <div class="row"><span class="bold total">${t.receiptTotal}:</span><span class="bold total">${amount} ${currency}</span></div>
    <div class="line"></div>
    <div class="row"><span>${t.receiptCashier}:</span><span>${kane.cashierName || '—'}</span></div>
    <div class="line"></div>
    <div class="center" style="font-size:11px">${t.receiptThanks}</div>
    <div class="center" style="font-size:10px; margin-top:8px">Powered by PLUS GROUP</div>
    </body></html>
  `)
  w.document.close()
  w.print()
}

// ── Modal Kreye Kanè
function KaneModal({ lang, tenant, onClose, onSave }) {
  const t = T[lang] || T.ht
  const [form, setForm] = useState({
    description: '', amount: '', currency: tenant?.defaultCurrency || 'HTG',
    clientName: '', clientPhone: '', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
          <h3 style={{ color: COLORS.gold, margin: 0 }}>
            <CreditCard size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {t.newKane}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Deskripsyon */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.description} *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
            />
          </div>

          {/* Montan + Monè */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.amount} *</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, fontWeight: 700, marginTop: 4,
                  background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: COLORS.gold, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.currency}</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
                  background: '#1e293b', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}>
                <option value="HTG">HTG</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Kliyan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.clientName}</label>
              <input value={form.clientName} onChange={e => set('clientName', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
                  background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.clientPhone}</label>
              <input value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4,
                  background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Nòt */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12 }}>{t.notes}</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 4, resize: 'none',
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600
          }}>{t.cancel}</button>
          <button onClick={() => {
            if (!form.description || !form.amount) return toast.error('Deskripsyon ak montan obligatwa.')
            onSave(form)
          }} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none',
            background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`,
            color: '#000', cursor: 'pointer', fontWeight: 700
          }}>{t.create}</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// KONPOZAN PRENSIPAL
// ══════════════════════════════════════════════
export default function KanePage() {
  const { user, tenant } = useAuthStore()
  const lang = tenant?.defaultLanguage || 'ht'
  const t = T[lang] || T.ht
  const qc = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Verifye plan Antepriz
 const planName = tenant?.plan?.name || ''
const isEnterprise = ['antepriz', 'antrepriz', 'entreprise', 'enterprise']
  .includes(planName.toLowerCase().trim())

  // Chaje kanè yo (API endpoint /api/v1/kane)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kane', filter],
    queryFn: () => api.get('/kane', { params: { status: filter !== 'all' ? filter : undefined } })
      .then(r => r.data),
    // Si endpoint pa egziste yet, retounen done vide
    onError: () => ({ kanes: [], stats: { totalToday: 0, totalPaid: 0, totalPending: 0 } })
  })

  const kanes = (data?.kanes || []).filter(k =>
    !search || k.description?.toLowerCase().includes(search.toLowerCase()) ||
    k.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    k.kaneNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = data?.stats || { totalToday: 0, totalPaid: 0, totalPending: 0 }

  // Kreye
  const createMutation = useMutation({
    mutationFn: (form) => api.post('/kane', form),
    onSuccess: (res) => {
      toast.success('Kanè kreye!')
      qc.invalidateQueries(['kane'])
      setShowModal(false)
      // Enprime dirèkteman
      if (res.data?.kane) printKane(res.data.kane, tenant, t)
    },
    onError: err => toast.error(err.response?.data?.message || 'Erè kreye kanè')
  })

  // Chanje statut
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/kane/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries(['kane']); toast.success('Statut ajou!') },
    onError: err => toast.error(err.response?.data?.message || 'Erè')
  })

  const handleMarkPaid = (kane) => {
    if (window.confirm(t.confirmPaid)) statusMutation.mutate({ id: kane.id, status: 'paid' })
  }
  const handleCancel = (kane) => {
    if (window.confirm(t.confirmCancel)) statusMutation.mutate({ id: kane.id, status: 'cancelled' })
  }

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: COLORS.gold, margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={22} />{t.title}
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => refetch()} style={{
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: 'transparent', color: '#94a3b8', cursor: 'pointer'
          }}><RefreshCw size={14} /></button>
          <button onClick={() => setShowModal(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`,
            color: '#000', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Plus size={15} />{t.newKane}
          </button>
        </div>
      </div>

      {/* Statistik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: t.totalToday, val: `${Number(stats.totalToday || 0).toLocaleString('fr-HT')} HTG`, color: COLORS.gold },
          { label: t.totalPaid, val: `${Number(stats.totalPaid || 0).toLocaleString('fr-HT')} HTG`, color: '#27ae60' },
          { label: t.totalPending, val: `${Number(stats.totalPending || 0).toLocaleString('fr-HT')} HTG`, color: '#C9A84C' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: 16, textAlign: 'center'
          }}>
            <div style={{ color, fontWeight: 800, fontSize: 20 }}>{val}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, fontSize: 13,
              background: COLORS.card, border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        {['all', 'pending', 'paid', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${filter === s ? COLORS.gold : 'rgba(255,255,255,0.1)'}`,
            background: filter === s ? 'rgba(201,168,76,0.15)' : 'transparent',
            color: filter === s ? COLORS.gold : '#64748b',
            cursor: 'pointer', fontSize: 12, fontWeight: filter === s ? 700 : 400
          }}>
            {t[s]}
          </button>
        ))}
      </div>

      {/* Tablo / Lis */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Chajman...</div>
      ) : kanes.length === 0 ? (
        <div style={{
          textAlign: 'center', color: '#64748b', padding: 60,
          background: COLORS.card, borderRadius: 12, border: `1px dashed ${COLORS.border}`
        }}>
          <CreditCard size={40} color="#334155" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>{t.noKane}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {kanes.map(kane => {
            const ss = STATUS_STYLE[kane.status] || STATUS_STYLE.pending
            return (
              <div key={kane.id} style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }}>
                {/* Nimewo */}
                <div style={{ minWidth: 80 }}>
                  <div style={{ color: '#64748b', fontSize: 10 }}>{t.kaneNum}</div>
                  <div style={{ color: COLORS.gold, fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                    #{kane.kaneNumber || 'KNE-001'}
                  </div>
                </div>

                {/* Deskripsyon */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{kane.description}</div>
                  {kane.clientName && (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{kane.clientName} {kane.clientPhone ? `· ${kane.clientPhone}` : ''}</div>
                  )}
                </div>

                {/* Montan */}
                <div style={{ minWidth: 100, textAlign: 'right' }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>
                    {Number(kane.amount).toLocaleString('fr-HT')}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{kane.currency || 'HTG'}</div>
                </div>

                {/* Statut */}
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: ss.bg, color: ss.color, minWidth: 70, textAlign: 'center'
                }}>
                  {ss.label} {t[kane.status]}
                </span>

                {/* Dat */}
                <div style={{ color: '#64748b', fontSize: 11, minWidth: 80, textAlign: 'right' }}>
                  {new Date(kane.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                </div>

                {/* Aksyon */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => printKane(kane, tenant, t)} title={t.print} style={{
                    padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.06)', color: '#94a3b8'
                  }}><Printer size={13} /></button>
                  {kane.status === 'pending' && (
                    <>
                      <button onClick={() => handleMarkPaid(kane)} title={t.markPaid} style={{
                        padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: 'rgba(39,174,96,0.15)', color: '#27ae60', fontWeight: 700, fontSize: 11
                      }}><CheckCircle size={13} /></button>
                      <button onClick={() => handleCancel(kane)} title={t.markCancelled} style={{
                        padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: 'rgba(192,57,43,0.12)', color: '#C0392B'
                      }}><XCircle size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <KaneModal
          lang={lang}
          tenant={tenant}
          onClose={() => setShowModal(false)}
          onSave={(form) => createMutation.mutate(form)}
        />
      )}
    </div>
  )
}
