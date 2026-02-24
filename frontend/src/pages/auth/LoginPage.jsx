// src/pages/auth/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Zap, Building2 } from 'lucide-react'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // 1. Mete slug nan header ANVAN demann lan
      const slug = data.slug.trim().toLowerCase()
      api.defaults.headers.common['X-Tenant-Slug'] = slug

      // 2. Login
      const res = await authAPI.login({ email: data.email, password: data.password })
      setAuth(res.data.token, res.data.user, null)

      // 3. Récupérer infos tenant konplè
      const meRes = await authAPI.me()
      setAuth(res.data.token, meRes.data.user, meRes.data.tenant)

      toast.success(`Byenveni, ${res.data.user.fullName}! 🎉`)
      navigate('/dashboard')
    } catch (e) {
      // erè gere pa interceptor axios
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 flex items-center justify-center p-4">

      {/* Cercles décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">

        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">PLUS GROUP</h1>
          <p className="text-brand-300 text-sm font-medium">Innov@tion & Tech — SaaS</p>
        </div>

        {/* Card login */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
          <h2 className="text-xl font-display font-bold text-white mb-6">Konekte nan kont ou</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Slug entreprise */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Non Entreprise (slug)
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="plus-store"
                  {...register('slug', { required: 'Slug entreprise obligatwa' })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all"
                />
              </div>
              {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
              <p className="text-slate-500 text-[11px] mt-1">
                Egzanp: <span className="font-mono text-brand-400">plus-store</span>
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="ou@entreprise.ht"
                {...register('email', {
                  required: 'Email obligatwa',
                  pattern: { value: /^\S+@\S+$/, message: 'Email pa valid' }
                })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Modpas</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', { required: 'Modpas obligatwa' })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold rounded-xl
                         flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-900/50
                         disabled:opacity-60 disabled:cursor-not-allowed active:scale-[.98] mt-2"
            >
              {loading
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Koneksyon...</>
                : <><LogIn size={18} /> Konekte</>
              }
            </button>
          </form>

          {/* Hint idantifyan demo */}
          <div className="mt-5 p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-slate-400 text-[11px] font-mono text-center leading-relaxed">
              Demo → slug: <span className="text-brand-300">plus-store</span>
              {' · '}email: <span className="text-brand-300">admin@plusstore.ht</span>
              {' · '}mdp: <span className="text-brand-300">PlusStore2024!</span>
            </p>
          </div>

          <p className="text-center text-slate-400 text-xs mt-4">
            Ou bliye modpas ou?{' '}
            <button className="text-brand-300 hover:text-white underline transition-colors">
              Reyinisyalize
            </button>
          </p>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2025 PLUS GROUP — Innov@tion & Tech. Tout dwa rezève.
        </p>
      </div>
    </div>
  )
}
