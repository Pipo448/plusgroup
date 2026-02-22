// src/pages/admin/AdminLogin.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { adminAPI } from '../../services/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await adminAPI.login(data)
      // Stocke token super admin séparement
      localStorage.setItem('pg-admin-token', res.data.token)
      localStorage.setItem('pg-admin-user', JSON.stringify(res.data.admin))
      toast.success(`Byenveni, ${res.data.admin.name}!`)
      navigate('/admin/dashboard')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Idantifyan pa kòrèk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #06123d 0%, #0e2d8a 50%, #0a1f63 100%)' }}>

      {/* Décor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #f5c518, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #fa8072, transparent)' }} />
        {/* Gold top border */}
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, transparent, #f5c518 30%, #d4a017 50%, #f5c518 70%, transparent)' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">

        {/* Badge admin */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-gold"
              style={{ background: 'linear-gradient(135deg, #92690a, #f5c518, #b8860b)' }}>
              <ShieldCheck size={36} className="text-royal-900" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">PLUS GROUP</h1>
              <div className="inline-flex items-center gap-2 mt-1.5 px-4 py-1 rounded-full"
                style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.4)' }}>
                <ShieldCheck size={12} style={{ color: '#f5c518' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f5c518' }}>
                  Super Admin Panel
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-luxury"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(245,197,24,0.2)', backdropFilter: 'blur(20px)' }}>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#f5c518' }}>
                Email Admin
              </label>
              <input type="email" placeholder="admin@plusinnovation.ht"
                {...register('email', { required: true })}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  '--tw-ring-color': 'rgba(245,197,24,0.4)'
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#f5c518' }}>
                Modpas
              </label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} placeholder="••••••••"
                  {...register('password', { required: true })}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 focus:outline-none transition-all pr-12"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-royal-900 transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading ? '#d4a017' : 'linear-gradient(135deg, #b8860b, #f5c518, #d4a017)',
                boxShadow: '0 4px 20px rgba(245,197,24,0.4)',
              }}>
              {loading
                ? <><div className="w-5 h-5 border-2 border-royal-900/30 border-t-royal-900 rounded-full animate-spin" /> Koneksyon...</>
                : <><ShieldCheck size={18} /> Konekte kòm Admin</>
              }
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 p-3 rounded-xl text-center"
            style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.15)' }}>
            <p className="text-[11px] font-mono" style={{ color: 'rgba(245,197,24,0.7)' }}>
              Demo: <span style={{ color: '#f5c518' }}>admin@plusinnovation.ht</span>
              {' / '}
              <span style={{ color: '#f5c518' }}>PlusAdmin2024!</span>
            </p>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Aksè rezève pou administratè sistèm
        </p>
      </div>
    </div>
  )
}
