// src/pages/internet/InternetClientsPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { internetAPI } from '../../services/api'
import {
  Wifi, Plus, Search, Pencil, Trash2, RefreshCw,
  User, Phone, Shield, CheckCircle, XCircle, Loader2
} from 'lucide-react'

export default function InternetClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)   // kliyan k ap edite
  const [showRenew, setShowRenew] = useState(null)   // kliyan k ap renouvle

  // ── Chaje kliyan yo ───────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['internet-clients', search],
    queryFn:  () => internetAPI.getClients({ search }).then(r => r.data),
  })

  const clients = data?.clients || data || []

  // ── Efase ─────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id) => internetAPI.deleteClient(id),
    onSuccess: () => {
      toast.success('Kliyan efase')
      qc.invalidateQueries(['internet-clients'])
    },
    onError: () => toast.error('Erè efasaj'),
  })

  function handleDelete(client) {
    if (!confirm(`Efase kliyan "${client.full_name}" ?`)) return
    deleteMut.mutate(client.id)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">PLUS INTERNET</h1>
            <p className="text-sm text-gray-500">Jere kliyan entènèt yo</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvo kliyan
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Chèche pa non, telefòn, username…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* ── Tabèl ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Ap chaje…</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <Wifi className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Pa gen kliyan encore</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true) }}
              className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
            >
              Ajoute premye kliyan an
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kliyan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estati</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                          {c.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.full_name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{c.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {c.mikrotik_username}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
                        {c.plan_name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        c.active !== false
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {c.active !== false
                          ? <><CheckCircle className="w-3 h-3" />Aktif</>
                          : <><XCircle className="w-3 h-3" />Inaktif</>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowRenew(c)}
                          title="Renouvle"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditing(c); setShowForm(true) }}
                          title="Edite"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Efase"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal fòm kreye/edite ── */}
      {showForm && (
        <ClientFormModal
          client={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSuccess={() => {
            setShowForm(false)
            setEditing(null)
            qc.invalidateQueries(['internet-clients'])
          }}
        />
      )}

      {/* ── Modal renouvle ── */}
      {showRenew && (
        <RenewModal
          client={showRenew}
          onClose={() => setShowRenew(null)}
          onSuccess={() => {
            setShowRenew(null)
            qc.invalidateQueries(['internet-clients'])
          }}
        />
      )}
    </div>
  )
}

/* ── Modal Kreye / Edite Kliyan ─────────────────────────── */
function ClientFormModal({ client, onClose, onSuccess }) {
  const isEdit = !!client
  const [form, setForm] = useState({
    full_name:         client?.full_name         || '',
    phone:             client?.phone             || '',
    email:             client?.email             || '',
    mikrotik_username: client?.mikrotik_username || '',
    mikrotik_password: client?.mikrotik_password || '',
    plan_name:         client?.plan_name         || '',
  })

  const mut = useMutation({
    mutationFn: () => isEdit
      ? internetAPI.updateClient(client.id, form)
      : internetAPI.createClient(form),
    onSuccess: () => {
      toast.success(isEdit ? 'Kliyan mete ajou' : 'Kliyan kreye')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erè sevè'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name || !form.phone || !form.mikrotik_username || !form.mikrotik_password) {
      toast.error('Ranpli tout chan obligatwa yo')
      return
    }
    mut.mutate()
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const lbl = "block text-xs font-medium text-gray-600 mb-1"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">
              {isEdit ? 'Edite kliyan' : 'Nouvo kliyan'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Non konplè *</label>
              <input className={inp} value={form.full_name}
                onChange={e => setForm({...form, full_name: e.target.value})}
                placeholder="Jean Dasner" />
            </div>
            <div>
              <label className={lbl}>Telefòn *</label>
              <input className={inp} value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="50937000000" />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input className={inp} type="email" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="kliyan@email.com" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Kont Mikrotik
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Non itilizatè *</label>
                <input className={inp} value={form.mikrotik_username}
                  onChange={e => setForm({...form, mikrotik_username: e.target.value})}
                  placeholder="client001" disabled={isEdit} />
              </div>
              <div>
                <label className={lbl}>Modpas *</label>
                <input className={inp} value={form.mikrotik_password}
                  onChange={e => setForm({...form, mikrotik_password: e.target.value})}
                  placeholder="••••••••" />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Plan</label>
                <select className={inp} value={form.plan_name}
                  onChange={e => setForm({...form, plan_name: e.target.value})}>
                  <option value="">Chwazi yon plan</option>
                  <option value="Plan Baz 2Mbps">Plan Baz — 2 Mbps</option>
                  <option value="Plan Standad 5Mbps">Plan Standad — 5 Mbps</option>
                  <option value="Plan Avanse 10Mbps">Plan Avanse — 10 Mbps</option>
                  <option value="Plan Biznis 20Mbps">Plan Biznis — 20 Mbps</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Anile
            </button>
            <button type="submit" disabled={mut.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Mete ajou' : 'Kreye kliyan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Modal Renouvle Abònman ─────────────────────────────── */
function RenewModal({ client, onClose, onSuccess }) {
  const [form, setForm] = useState({
    client_id:    client.id,
    new_profile:  client.plan_name || '',
    amount:       '',
    duration_days: '30',
  })

  const mut = useMutation({
    mutationFn: () => internetAPI.renewClient(form),
    onSuccess: () => {
      toast.success('Abònman renouvle ak siksè!')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erè renouvèlman'),
  })

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
  const lbl = "block text-xs font-medium text-gray-600 mb-1"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Renouvle abònman</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info kliyan */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              {client.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{client.full_name}</p>
              <p className="text-xs text-gray-400">{client.mikrotik_username}</p>
            </div>
          </div>

          <div>
            <label className={lbl}>Nouvo plan</label>
            <select className={inp} value={form.new_profile}
              onChange={e => setForm({...form, new_profile: e.target.value})}>
              <option value="">Chwazi yon plan</option>
              <option value="Plan Baz 2Mbps">Plan Baz — 2 Mbps</option>
              <option value="Plan Standad 5Mbps">Plan Standad — 5 Mbps</option>
              <option value="Plan Avanse 10Mbps">Plan Avanse — 10 Mbps</option>
              <option value="Plan Biznis 20Mbps">Plan Biznis — 20 Mbps</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Montan (HTG)</label>
              <input className={inp} type="number" value={form.amount}
                onChange={e => setForm({...form, amount: e.target.value})}
                placeholder="500" />
            </div>
            <div>
              <label className={lbl}>Dire (jou)</label>
              <select className={inp} value={form.duration_days}
                onChange={e => setForm({...form, duration_days: e.target.value})}>
                <option value="7">7 jou</option>
                <option value="15">15 jou</option>
                <option value="30">30 jou</option>
                <option value="90">90 jou</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Anile
            </button>
            <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.new_profile || !form.amount}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Renouvle
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
