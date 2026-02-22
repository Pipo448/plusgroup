// src/pages/admin/AdminLoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Shield, Lock } from 'lucide-react'
import { adminAPI } from '../../services/api'

// Store séparé pour super admin (localStorage direct)
const setAdminSession = (token, admin) => {
  localStorage.setItem('pg-admin', JSON.stringify({ token, admin }))
}

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await adminAPI.login(data)
      setAdminSession(res.data.token, res.data.admin)
      toast.success(`Byenveni, ${res.data.admin.name}!`)
      navigate('/admin/dashboard')
    } catch(e) {
      toast.error(e.response?.data?.message || 'Idantifyan pa kòrèk.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #050d1f 0%, #0f2347 40%, #1a1a2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: 'DM Sans, sans-serif',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Décors géométriques */}
      <div style={{ position:'absolute', top:-100, left:-100, width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-80, right:-80, width:350, height:350, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(192,57,43,0.08) 0%, transparent 70%)', pointerEvents:'none' }}/>
      {/* Grille subtile */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)',
        backgroundSize:'60px 60px'
      }}/>

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>

        {/* Badge SUPER ADMIN */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            display:'inline-flex', flexDirection:'column', alignItems:'center', gap:10
          }}>
            <div style={{
              width:70, height:70, borderRadius:20,
              background:'linear-gradient(135deg, #C9A84C, #f0d080)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 40px rgba(201,168,76,0.4)',
              border:'2px solid rgba(201,168,76,0.3)'
            }}>
              <Shield size={32} color="#0f2347"/>
            </div>
            <div>
              <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:'0 0 2px' }}>
                PLUS GROUP
              </h1>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6,
                background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)',
                borderRadius:99, padding:'3px 12px' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }}/>
                <span style={{ color:'#C9A84C', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card login */}
        <div style={{
          background:'rgba(255,255,255,0.04)',
          backdropFilter:'blur(20px)',
          border:'1px solid rgba(201,168,76,0.15)',
          borderRadius:24, padding:32,
          boxShadow:'0 24px 80px rgba(0,0,0,0.5)',
          position:'relative', overflow:'hidden'
        }}>
          {/* Ligne or haut */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
            background:'linear-gradient(90deg, transparent, #C9A84C 40%, #E8836A 70%, transparent)'
          }}/>

          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <Lock size={16} color="#C9A84C"/>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, margin:0 }}>
              Aksè restriksyon — Super Admin sèlman
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Email */}
            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:600,
                marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Email Admin
              </label>
              <input
                type="email"
                placeholder="admin@plusinnovation.ht"
                {...register('email', { required: 'Email obligatwa' })}
                style={{
                  width:'100%', padding:'13px 16px', borderRadius:12, boxSizing:'border-box',
                  background:'rgba(255,255,255,0.05)',
                  border: errors.email ? '1px solid rgba(192,57,43,0.6)' : '1px solid rgba(255,255,255,0.1)',
                  color:'#fff', fontSize:14, fontFamily:'IBM Plex Sans, sans-serif',
                  outline:'none', transition:'border 0.2s'
                }}
                onFocus={e => e.target.style.border = '1px solid rgba(201,168,76,0.5)'}
                onBlur={e => e.target.style.border = errors.email ? '1px solid rgba(192,57,43,0.6)' : '1px solid rgba(255,255,255,0.1)'}
              />
              {errors.email && <p style={{ color:'#ff6b6b', fontSize:11, marginTop:4 }}>{errors.email.message}</p>}
            </div>

            {/* Modpas */}
            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:600,
                marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Modpas
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  {...register('password', { required: 'Modpas obligatwa' })}
                  style={{
                    width:'100%', padding:'13px 48px 13px 16px', borderRadius:12, boxSizing:'border-box',
                    background:'rgba(255,255,255,0.05)',
                    border: errors.password ? '1px solid rgba(192,57,43,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    color:'#fff', fontSize:14, fontFamily:'IBM Plex Sans, sans-serif',
                    outline:'none', transition:'border 0.2s'
                  }}
                  onFocus={e => e.target.style.border = '1px solid rgba(201,168,76,0.5)'}
                  onBlur={e => e.target.style.border = errors.password ? '1px solid rgba(192,57,43,0.6)' : '1px solid rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShow(!show)} style={{
                  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer',
                  color:'rgba(255,255,255,0.4)', padding:0, display:'flex'
                }}>
                  {show ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              {errors.password && <p style={{ color:'#ff6b6b', fontSize:11, marginTop:4 }}>{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'14px',
              background: loading ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #C9A84C, #f0d080)',
              border:'none', borderRadius:12, cursor: loading ? 'not-allowed' : 'pointer',
              color:'#0f2347', fontSize:14, fontWeight:800,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'0 6px 24px rgba(201,168,76,0.4)',
              transition:'all 0.2s', marginTop:4
            }}>
              {loading
                ? <><div style={{ width:18, height:18, border:'2px solid rgba(15,35,71,0.3)', borderTopColor:'#0f2347', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Koneksyon...</>
                : <><Shield size={16}/> Aksede kòm Super Admin</>
              }
            </button>
          </form>

          {/* Hint demo */}
          <div style={{
            marginTop:20, padding:'10px 14px',
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:10
          }}>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, margin:0, fontFamily:'IBM Plex Mono', textAlign:'center', lineHeight:1.6 }}>
              Demo → <span style={{ color:'#C9A84C' }}>admin@plusinnovation.ht</span>
              {' / '}
              <span style={{ color:'#C9A84C' }}>PlusAdmin2024!</span>
            </p>
          </div>
        </div>

        <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:11, marginTop:20 }}>
          © 2025 PLUS GROUP — Innov@tion & Tech
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
