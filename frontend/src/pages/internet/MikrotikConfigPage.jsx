// src/pages/internet/MikrotikConfigPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { internetAPI } from '../../services/api'
import {
  Router, Save, TestTube, CheckCircle, XCircle,
  Loader2, Eye, EyeOff, Info
} from 'lucide-react'

export default function MikrotikConfigPage() {
  const qc = useQueryClient()
  const [showPass, setShowPass] = useState(false)
  const [testResult, setTestResult] = useState(null) // 'ok' | 'fail' | null

  // ── Chaje config egzistant ────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['mikrotik-config'],
    queryFn:  () => internetAPI.getMikrotikConfig().then(r => r.data),
  })

  const [form, setForm] = useState({
    host:     '',
    port:     '8728',
    username: 'admin',
    password: '',
    use_ssl:  false,
  })

  // Ranpli fòm si gen config deja
  useState(() => {
    if (data) setForm({
      host:     data.host     || '',
      port:     data.port     || '8728',
      username: data.username || 'admin',
      password: data.password || '',
      use_ssl:  data.use_ssl  || false,
    })
  }, [data])

  // ── Sove config ───────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () => internetAPI.saveMikrotikConfig(form),
    onSuccess: () => {
      toast.success('Konfigirasyon sove!')
      qc.invalidateQueries(['mikrotik-config'])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erè sovgad'),
  })

  // ── Teste koneksyon ───────────────────────────────────
  const testMut = useMutation({
    mutationFn: () => internetAPI.testMikrotikConfig(),
    onSuccess: () => {
      setTestResult('ok')
      toast.success('Koneksyon Mikrotik mache!')
    },
    onError: () => {
      setTestResult('fail')
      toast.error('Koneksyon Mikrotik echwe')
    },
  })

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const lbl = "block text-xs font-medium text-gray-600 mb-1"

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Ap chaje…</span>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Router className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Konfigirasyon Mikrotik</h1>
          <p className="text-sm text-gray-500">Konekte routeur ou a ak sistèm lan</p>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700 space-y-1">
          <p className="font-medium">Kijan sa travay?</p>
          <p>Backend la konekte dirèkteman ak Mikrotik ou a sou pò <strong>8728</strong> (API) pou chèche done kliyan yo ak jere sesyon yo.</p>
          <p>Asire w routeur la sou menm rezo ak servè a, oswa IP piblik li aksesib.</p>
        </div>
      </div>

      {/* ── Fòm ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Paramèt koneksyon</h2>

        {/* Tès rezilta */}
        {testResult && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            testResult === 'ok'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {testResult === 'ok'
              ? <><CheckCircle className="w-4 h-4" /> Koneksyon ak Mikrotik reyisi!</>
              : <><XCircle className="w-4 h-4" /> Pa ka konekte — verifye IP, pò ak modpas.</>
            }
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* IP / Host */}
          <div className="col-span-2 sm:col-span-1">
            <label className={lbl}>IP adrès Mikrotik *</label>
            <input className={inp} value={form.host}
              onChange={e => setForm({...form, host: e.target.value})}
              placeholder="192.168.1.1" />
            <p className="text-xs text-gray-400 mt-1">IP lokal oswa piblik routeur la</p>
          </div>

          {/* Pò */}
          <div className="col-span-2 sm:col-span-1">
            <label className={lbl}>Pò API</label>
            <input className={inp} type="number" value={form.port}
              onChange={e => setForm({...form, port: e.target.value})}
              placeholder="8728" />
            <p className="text-xs text-gray-400 mt-1">Pò default: 8728 (RouterOS API)</p>
          </div>

          {/* Username */}
          <div>
            <label className={lbl}>Non itilizatè *</label>
            <input className={inp} value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              placeholder="admin" />
          </div>

          {/* Password */}
          <div>
            <label className={lbl}>Modpas *</label>
            <div className="relative">
              <input
                className={inp}
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="••••••••"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* SSL */}
          <div className="col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm({...form, use_ssl: !form.use_ssl})}
                className={`w-10 h-6 rounded-full transition-colors ${form.use_ssl ? 'bg-indigo-600' : 'bg-gray-200'} relative`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.use_ssl ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Itilize SSL (API-SSL)</p>
                <p className="text-xs text-gray-400">Aktive si ou gen sètifika SSL sou Mikrotik — pò 8729</p>
              </div>
            </label>
          </div>
        </div>

        {/* Bouton yo */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => { setTestResult(null); testMut.mutate() }}
            disabled={testMut.isPending || !form.host || !form.username}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {testMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <TestTube className="w-4 h-4" />
            }
            Teste koneksyon
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.host || !form.username || !form.password}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saveMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />
            }
            Sove konfigirasyon
          </button>
        </div>
      </div>

      {/* ── Achitekti ── */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Achitekti koneksyon</p>
        <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
          {['App kliyan', 'Backend API', 'Mikrotik RouterOS', 'Kliyan WiFi'].map((item, i, arr) => (
            <div key={item} className="flex items-center gap-3">
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 font-medium text-xs">
                {item}
              </span>
              {i < arr.length - 1 && <span className="text-gray-400">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
