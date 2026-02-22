// src/pages/settings/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Settings, Users, DollarSign, Upload, Save, RefreshCw, ArrowUpDown } from 'lucide-react'

export default function SettingsPage() {
  const { updateTenant } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [newRate, setNewRate] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantAPI.getSettings().then(r => r.data.tenant)
  })

  const { register, handleSubmit, reset, watch } = useForm()

  // ✅ Chaje valè yo nan fòm lan chak fwa settings yo chaje
  useEffect(() => {
    if (settings) reset({
      name:            settings.name            || '',
      email:           settings.email           || '',
      phone:           settings.phone           || '',
      address:         settings.address         || '',
      primaryColor:    settings.primaryColor    || '#1E40AF',
      taxRate:         settings.taxRate         || 0,
      defaultLanguage: settings.defaultLanguage || 'ht',
      defaultCurrency: settings.defaultCurrency || 'HTG',
      receiptSize:     settings.receiptSize     || '80mm',  // ✅ Ajoute
    })
  }, [settings, reset])

  // ✅ Mete ajou paramèt jeneral
  const updateMutation = useMutation({
    mutationFn: (data) => tenantAPI.updateSettings(data),
    onSuccess: (res) => {
      const updated = res.data.tenant
      // ✅ Update Zustand store → sidebar ak header mete ajou imedyatman
      updateTenant({ ...settings, ...updated })
      qc.setQueryData(['tenant-settings'], (old) => ({ ...old, ...updated }))
      toast.success('Paramèt sovgade!')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan sovgad.')
  })

  // ✅ Mete ajou taux chanje
  const rateMutation = useMutation({
    mutationFn: (rate) => tenantAPI.updateRate(rate),
    onSuccess: (_, rate) => {
      updateTenant({ ...settings, exchangeRate: rate })
      qc.setQueryData(['tenant-settings'], (old) => ({ ...old, exchangeRate: rate }))
      toast.success(`Taux ajou: 1 USD = ${rate} HTG`)
      setNewRate('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })

  const TABS = [
    { key:'general',  label:'Jeneral',       icon:<Settings size={15}/> },
    { key:'currency', label:'Taux & Devise',  icon:<DollarSign size={15}/> },
    { key:'users',    label:'Itilizatè',      icon:<Users size={15}/> },
  ]

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"/>
    </div>
  )

  const currentRate = Number(settings?.exchangeRate || 132)

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="page-title">Paramèt</h1>
        <p className="text-slate-500 text-sm">{settings?.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.key ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══ JENERAL ══ */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-5">

          <div className="card p-5 space-y-4">
            <h3 className="section-title">Enfòmasyon Entreprise</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Non Entreprise *</label>
                <input className="input" {...register('name', { required: true })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" {...register('email')} />
              </div>
              <div>
                <label className="label">Telefòn</label>
                <input className="input" {...register('phone')} />
              </div>
              <div className="col-span-2">
                <label className="label">Adrès</label>
                <input className="input" {...register('address')} />
              </div>
              <div>
                <label className="label">Koulè Prensipal (hex)</label>
                <div className="flex gap-2 items-center">
                  <input className="input flex-1" placeholder="#1E40AF" {...register('primaryColor')} />
                  <input type="color" className="w-10 h-10 rounded cursor-pointer border border-slate-200 p-0.5"
                    value={watch('primaryColor') || '#1E40AF'}
                    onChange={e => reset({ ...watch(), primaryColor: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Taks TVA (%)</label>
                <input type="number" step="0.5" min="0" max="100" className="input" {...register('taxRate')} />
              </div>
              <div>
                <label className="label">Lang defò</label>
                <select className="input" {...register('defaultLanguage')}>
                  <option value="ht">Kreyòl Ayisyen</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="label">Devise defò</label>
                <select className="input" {...register('defaultCurrency')}>
                  <option value="HTG">HTG — Goud Ayisyen</option>
                  <option value="USD">USD — Dola Ameriken</option>
                </select>
              </div>
              <div>
                <label className="label">Gwosè Receipt Thermal</label>
                <select className="input" {...register('receiptSize')}>
                  <option value="80mm">80mm × ∞ (Papye laj)</option>
                  <option value="57mm">57mm × ∞ (Papye etwat)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Pou enprimant thermal (receipt)</p>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="card p-5">
            <h3 className="section-title">Logo Entreprise</h3>
            <div className="flex items-center gap-4">
              {settings?.logoUrl
                ? <img src={settings.logoUrl} alt="logo"
                    className="w-16 h-16 rounded-xl object-contain border border-slate-200 p-1"/>
                : <div className="w-16 h-16 rounded-xl bg-brand-100 flex items-center justify-center
                    text-brand-600 font-display font-bold text-2xl">
                    {settings?.name?.charAt(0)}
                  </div>
              }
              <div>
                <label className="btn-secondary cursor-pointer">
                  <Upload size={15}/> Chwazi Logo
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      const fd = new FormData()
                      fd.append('logo', file)
                      try {
                        const res = await tenantAPI.uploadLogo(fd)
                        updateTenant({ ...settings, logoUrl: res.data.logoUrl })
                        qc.setQueryData(['tenant-settings'], old => ({ ...old, logoUrl: res.data.logoUrl }))
                        toast.success('Logo ajou!')
                      } catch { toast.error('Erè upload logo.') }
                    }}
                  />
                </label>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG · Max 5MB</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
              <Save size={16}/>
              {updateMutation.isPending ? 'Ap sovgade...' : 'Sovgade Chanjman'}
            </button>
          </div>
        </form>
      )}

      {/* ══ TAUX & DEVISE ══ */}
      {activeTab === 'currency' && (
        <div className="space-y-5">

          {/* Taux aktyèl */}
          <div className="card p-5">
            <h3 className="section-title">Taux Chanje Aktyèl</h3>
            <div className="flex items-center gap-4 p-4 bg-brand-50 border border-brand-200 rounded-xl mb-5">
              <ArrowUpDown size={28} className="text-brand-600 flex-shrink-0"/>
              <div>
                <p className="text-2xl font-bold text-brand-700 font-mono">
                  1 USD = {currentRate.toFixed(2)} HTG
                </p>
                <p className="text-sm text-brand-500">Taux sistèm ap itilize kounye a</p>
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label">Nouvo Taux (HTG pou 1 USD)</label>
                <input
                  type="number" step="0.01" min="1"
                  className="input font-mono"
                  placeholder={currentRate.toFixed(2)}
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const r = Number(newRate)
                  if (!newRate || r < 1) return toast.error('Taux pa valid.')
                  rateMutation.mutate(r)
                }}
                disabled={rateMutation.isPending || !newRate}
                className="btn-primary">
                <RefreshCw size={16}/> {rateMutation.isPending ? 'Ap mete ajou...' : 'Mete ajou'}
              </button>
            </div>
          </div>

          {/* Eksplikasyon konvèsyon */}
          <div className="card p-5">
            <h3 className="section-title">Konvèsyon Otomatik nan Devis & Facture</h3>
            <div className="space-y-3">

              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-700 font-display font-bold text-sm">HTG</span>
                </div>
                <div>
                  <p className="font-display font-semibold text-emerald-800 mb-1">Kasye chwazi Goud (HTG)</p>
                  <p className="text-emerald-600 text-sm">
                    Li antre pri yo an HTG. Sistèm nan kalkile total la an HTG epi konvèti
                    an USD otomatikman pou afiche <strong>tou 2 montan</strong> sou facture a.
                  </p>
                  <div className="mt-2 p-2 bg-emerald-100 rounded-lg font-mono text-xs text-emerald-700">
                    Egz: 10,000 HTG ÷ {currentRate.toFixed(0)} = {(10000/currentRate).toFixed(2)} USD
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-display font-bold text-sm">USD</span>
                </div>
                <div>
                  <p className="font-display font-semibold text-blue-800 mb-1">Kasye chwazi Dola (USD)</p>
                  <p className="text-blue-600 text-sm">
                    Li antre pri yo an USD. Sistèm nan kalkile total la an USD epi konvèti
                    an HTG otomatikman pou afiche <strong>tou 2 montan</strong> sou facture a.
                  </p>
                  <div className="mt-2 p-2 bg-blue-100 rounded-lg font-mono text-xs text-blue-700">
                    Egz: 100 USD × {currentRate.toFixed(0)} = {(100 * currentRate).toLocaleString()} HTG
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                💡 Taux aktyèl: <span className="font-mono font-bold">1 USD = {currentRate.toFixed(2)} HTG</span>.
                Chanje l nan tab "Taux Chanje" anwo a.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ITILIZATÈ ══ */}
      {activeTab === 'users' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Jesyon Itilizatè</h3>
            <Link to="/settings/users" className="btn-primary btn-sm">
              <Users size={14}/> Jere itilizatè
            </Link>
          </div>
          <p className="text-slate-500 text-sm mb-4">
            Ajoute, modifye oswa siprime itilizatè ki gen aksè nan sistèm nan.
          </p>
          {settings?.plan && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              Plan <strong>{settings.plan.name}</strong> pèmèt{' '}
              <strong>{settings.plan.maxUsers} itilizatè</strong>.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
