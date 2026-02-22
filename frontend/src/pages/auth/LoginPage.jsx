// src/pages/auth/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm()

  // ✅ Pre-fill slug ak email depi URL parameters
  useEffect(() => {
    const slugParam = searchParams.get('slug')
    const emailParam = searchParams.get('email')
    if (slugParam) setValue('slug', slugParam)
    if (emailParam) setValue('email', emailParam)
  }, [searchParams, setValue])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // 1. Slug pwòp
      const slug = data.slug.trim().toLowerCase()

      // 2. Mete slug nan TOUT kote ANVAN login
      api.defaults.headers.common['X-Tenant-Slug'] = slug

      // 3. Login
      const res = await authAPI.login({ slug, email: data.email, password: data.password })
      const { token, user } = res.data

      // 4. Mete token imedyatman pou /me
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      // 5. Jwenn tenant konplè via /me
      const meRes = await authAPI.me()
      const tenant = meRes.data.tenant

      // 6. Sove nan Zustand (persist → localStorage)
      setAuth(token, meRes.data.user, tenant)

      // 7. ✅ Asire slug la nan localStorage dirèkteman (pou evite race condition)
      try {
        const stored = JSON.parse(localStorage.getItem('pg-auth') || '{}')
        const authState = stored?.state || stored
        authState.token  = token
        authState.user   = meRes.data.user
        authState.tenant = tenant
        localStorage.setItem('pg-auth', JSON.stringify({ state: authState, version: 0 }))
      } catch {}

      toast.success(`Byenveni, ${user.fullName}! 🎉`)
      navigate('/dashboard')
    } catch (e) {
      api.defaults.headers.common['X-Tenant-Slug'] = ''
      const status = e.response?.status
      const msg    = e.response?.data?.message

      if (status === 402) {
        toast.error('Abònman ou ekspire. Kontakte administrasyon pou renouvle.', { duration: 6000 })
      } else if (status === 403) {
        toast.error(msg || 'Kont sa suspann oswa pa aktif.')
      } else if (status === 404) {
        toast.error('Slug entreprise pa jwenn. Verifye non antrepriz la.')
      } else {
        toast.error(msg || 'Idantifyan pa kòrèkt.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, #0A0A0F 0%, #1A0A00 45%, #2D1100 100%)' }}>

      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,69,0,0.15), transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)' }} />
      </div>

      {/* Top animated line */}
      <div className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, transparent, #C0392B, #C9A84C, #FF4500, #C9A84C, #C0392B, transparent)',
          animation: 'shimmer 4s linear infinite',
          backgroundSize: '200% 100%'
        }} />

      <div className="w-full max-w-md relative z-10">

        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #F0D080)',
              boxShadow: '0 8px 30px rgba(201,168,76,0.4)'
            }}>
            <span className="text-4xl font-black" style={{ color: '#0A0A0F' }}>P+</span>
          </div>
          <h1 className="text-4xl font-black mb-2" style={{ color: '#FFFFFF', fontFamily: 'DM Sans' }}>
            PLUS GROUP
          </h1>
          <p className="text-sm font-bold" style={{ color: '#C9A84C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Innovation & Tech — SaaS
          </p>
        </div>

        {/* Card login */}
        <div className="rounded-3xl p-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(201,168,76,0.2)'
          }}>
          <h2 className="text-2xl font-black mb-6" style={{ color: '#FFFFFF', fontFamily: 'DM Sans' }}>
            Konekte nan kont ou
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Slug entreprise */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Non Entreprise (slug)
              </label>
              <div className="relative">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#C9A84C' }} />
                <input
                  type="text"
                  placeholder="plus-store"
                  {...register('slug', { required: 'Slug entreprise obligatwa' })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl text-white placeholder-gray-400 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(201,168,76,0.2)',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                />
              </div>
              {errors.slug && <p className="text-xs mt-1" style={{ color: '#FF4500' }}>{errors.slug.message}</p>}
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Egzanp: <span style={{ color: '#C9A84C', fontFamily: 'monospace' }}>plus-store</span>
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="ou@entreprise.ht"
                {...register('email', {
                  required: 'Email obligatwa',
                  pattern: { value: /^\S+@\S+$/, message: 'Email pa valid' }
                })}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(201,168,76,0.2)',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: '#FF4500' }}>{errors.email.message}</p>}
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Modpas
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', { required: 'Modpas obligatwa' })}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 transition-all pr-12"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(201,168,76,0.2)',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#C9A84C'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs mt-1" style={{ color: '#FF4500' }}>{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all mt-6"
              style={{
                background: loading ? '#666' : 'linear-gradient(135deg, #C0392B, #FF4500)',
                color: '#FFFFFF',
                boxShadow: '0 6px 30px rgba(255,69,0,0.4)',
                fontFamily: 'DM Sans'
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)' }}
              onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1)' }}
            >
              {loading
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Koneksyon...</>
                : <><LogIn size={18} /> Konekte</>
              }
            </button>
          </form>

          {/* Hint idantifyan demo */}
          <div className="mt-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
              Demo → slug: <span style={{ color: '#C9A84C' }}>plus-store</span>
              {' · '}email: <span style={{ color: '#C9A84C' }}>admin@plusstore.ht</span>
              {' · '}mdp: <span style={{ color: '#C9A84C' }}>PlusStore2024!</span>
            </p>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Ou bliye modpas ou?{' '}
            <button className="underline transition-colors" style={{ color: '#C9A84C' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#F0D080'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#C9A84C'}
            >
              Reyinisyalize
            </button>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © 2026 PLUS GROUP — Innovation & Tech. Tout dwa rezève.
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
      `}</style>
    </div>
  )
}
