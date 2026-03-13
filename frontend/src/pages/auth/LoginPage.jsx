// src/pages/auth/LoginPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Building2, Globe, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

// ✅ Imaj yo — mete fichye yo nan /public/assets/
import bannerImg from '/assets/banner.webp'
import logoImg   from '/assets/logo.webp'

const LANGS = [
  { code:'ht', name:'Kreyòl',   flag:'🇭🇹' },
  { code:'fr', name:'Français', flag:'🇫🇷' },
  { code:'en', name:'English',  flag:'🇺🇸' },
]

const TEXTS = {
  ht: { title:'Konekte nan kont ou', slug:'Non Entreprise (slug)', email:'Email', password:'Modpas', submit:'Konekte', loading:'Koneksyon...', forgot:'Ou bliye modpas ou?', reset:'Reyinisyalize', example:'Egzanp', demo:'Demo', slugRequired:'Slug obligatwa', emailRequired:'Email obligatwa', emailInvalid:'Email pa valid', passRequired:'Modpas obligatwa' },
  fr: { title:'Connectez-vous', slug:'Nom Entreprise (slug)', email:'Email', password:'Mot de passe', submit:'Connexion', loading:'Connexion...', forgot:'Mot de passe oublié?', reset:'Réinitialiser', example:'Exemple', demo:'Démo', slugRequired:'Slug obligatoire', emailRequired:'Email obligatoire', emailInvalid:'Email invalide', passRequired:'Mot de passe obligatoire' },
  en: { title:'Sign in', slug:'Company Name (slug)', email:'Email', password:'Password', submit:'Sign In', loading:'Signing in...', forgot:'Forgot password?', reset:'Reset', example:'Example', demo:'Demo', slugRequired:'Slug required', emailRequired:'Email required', emailInvalid:'Invalid email', passRequired:'Password required' },
}

function Particles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    const particles = Array.from({length: 60}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 3 + 1,
      dx: (Math.random() - 0.5) * 0.6,
      dy: (Math.random() - 0.5) * 0.6,
      opacity: Math.random() * 0.5 + 0.15,
      color: Math.random() > 0.5 ? '#FF6600' : '#ffffff',
    }))
    let raf
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
      })
      ctx.globalAlpha = 1
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.08 * (1 - dist/120)) + ')'
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none' }}/>
}

export default function LoginPage() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth, autoSetBranch } = useAuthStore()

  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [showLang, setShowLang] = useState(false)
  const { i18n } = useTranslation()

  const currentLang = LANGS.find(l => l.code === i18n.language) || LANGS[0]
  const tx = TEXTS[i18n.language] || TEXTS.ht

  const { register, handleSubmit, formState:{ errors }, setValue } = useForm()

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('plusgroup-lang', code)
    setShowLang(false)
  }

  useEffect(() => {
    const onDoc = (e) => { if (!e.target.closest('#login-lang')) setShowLang(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const slugParam  = searchParams.get('slug')
    const emailParam = searchParams.get('email')
    if (slugParam)  setValue('slug', slugParam)
    if (emailParam) setValue('email', emailParam)
  }, [searchParams, setValue])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const slug = data.slug.trim().toLowerCase()

      localStorage.removeItem('pg-auth')
      localStorage.removeItem('plusgroup-slug')
      localStorage.removeItem('plusgroup-token')
      localStorage.removeItem('plusgroup-user')
      localStorage.removeItem('plusgroup-tenant')
      localStorage.removeItem('plusgroup-branch-id')
      localStorage.removeItem('plusgroup-branch-name')
      delete api.defaults.headers.common['X-Branch-Id']
      api.defaults.headers.common['X-Tenant-Slug'] = slug
      api.defaults.headers.common['Authorization'] = ''

      localStorage.setItem('plusgroup-slug', slug)

      const res = await authAPI.login({ slug, email: data.email, password: data.password })
      const { token } = res.data

      localStorage.setItem('plusgroup-token', token)
      api.defaults.headers.common['Authorization'] = 'Bearer ' + token

      const meRes  = await authAPI.me()
      const tenant = meRes.data.tenant
      const user   = meRes.data.user

      setAuth(token, user, tenant)

      const branches = res.data.branches || []
      autoSetBranch(branches)

      toast.success('Byenveni, ' + user.fullName + '! 🎉')
      navigate('/dashboard')
    } catch (e) {
      localStorage.removeItem('plusgroup-slug')
      localStorage.removeItem('plusgroup-token')
      localStorage.removeItem('plusgroup-branch-id')
      delete api.defaults.headers.common['X-Branch-Id']
      api.defaults.headers.common['X-Tenant-Slug'] = ''
      api.defaults.headers.common['Authorization'] = ''

      const status = e.response?.status
      const msg    = e.response?.data?.message
      if (status === 402)      toast.error('Abònman ou ekspire. Kontakte administrasyon.', { duration:6000 })
      else if (status === 403) toast.error(msg || 'Kont sa suspann oswa pa aktif.')
      else if (status === 404) toast.error('Slug entreprise pa jwenn.')
      else                     toast.error(msg || 'Idantifyan pa kòrèkt.')
    } finally { setLoading(false) }
  }

  const inp = {
    width:'100%', padding:'11px 14px', borderRadius:10,
    border:'1.5px solid rgba(255,255,255,0.25)', outline:'none',
    background:'rgba(20,15,60,0.55)', color:'#FFFFFF',
    WebkitTextFillColor:'#FFFFFF',
    fontSize:14, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box',
    backdropFilter:'blur(8px)', transition:'border-color 0.2s',
    caretColor:'#FF6600',
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16, position:'relative', overflow:'hidden', fontFamily:'DM Sans, sans-serif' }}>

      {/* ✅ Background banner — sèlman src URL, pa base64 */}
      <div style={{
        position:'absolute', inset:0, zIndex:0,
        backgroundImage: `url(${bannerImg})`,
        backgroundSize:'cover', backgroundPosition:'center',
        filter:'brightness(0.45)',
      }}/>

      <div style={{
        position:'absolute', inset:0, zIndex:0,
        background:'linear-gradient(135deg, rgba(26,20,100,0.75) 0%, rgba(180,60,0,0.55) 100%)',
      }}/>

      <Particles/>

      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, zIndex:3, background:'linear-gradient(90deg,transparent,#FF6600,#FFD700,#FF6600,transparent)', animation:'shimmer 3s linear infinite', backgroundSize:'200% 100%' }}/>

      {/* Language picker */}
      <div id="login-lang" style={{ position:'fixed', top:16, right:16, zIndex:50 }}>
        <button onClick={() => setShowLang(!showLang)} style={{
          display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:12,
          border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.1)',
          color:'rgba(255,255,255,0.9)', cursor:'pointer', fontSize:12, fontWeight:700, backdropFilter:'blur(10px)',
        }}>
          <Globe size={14}/><span style={{ fontSize:15 }}>{currentLang.flag}</span>
          <span style={{ fontSize:11 }}>{currentLang.code.toUpperCase()}</span>
          <ChevronDown size={12} style={{ transform: showLang ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
        </button>
        {showLang && (
          <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'rgba(10,10,40,0.97)', borderRadius:12, minWidth:170, boxShadow:'0 16px 48px rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.15)', overflow:'hidden', backdropFilter:'blur(20px)' }}>
            {LANGS.map(lang => (
              <button key={lang.code} onClick={() => changeLanguage(lang.code)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 16px', border:'none', cursor:'pointer',
                background: i18n.language === lang.code ? 'rgba(255,102,0,0.2)' : 'transparent',
                color: i18n.language === lang.code ? '#FF6600' : 'rgba(255,255,255,0.75)',
                fontWeight: i18n.language === lang.code ? 700 : 400, fontSize:13,
                borderBottom:'1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize:18 }}>{lang.flag}</span>
                <span style={{ flex:1 }}>{lang.name}</span>
                {i18n.language === lang.code && <span style={{ color:'#FF6600' }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:5 }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          {/* ✅ Logo — sèlman src URL, pa base64 */}
          <img src={logoImg} alt="PLUS GROUP Logo"
            style={{ height:90, width:'auto', marginBottom:12, filter:'drop-shadow(0 4px 20px rgba(255,102,0,0.5))' }}
          />
          <h1 style={{ color:'#fff', fontSize:32, fontWeight:900, margin:'0 0 4px', textShadow:'0 2px 12px rgba(0,0,0,0.5)' }}>PLUS GROUP</h1>
          <p style={{ color:'#FF6600', fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', margin:0, textShadow:'0 1px 6px rgba(0,0,0,0.4)' }}>
            Innov@tion & Tech — SaaS
          </p>
        </div>

        <div style={{
          borderRadius:24, padding:32,
          background:'rgba(255,255,255,0.1)',
          backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          border:'1px solid rgba(255,255,255,0.2)',
          boxShadow:'0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}>
          <h2 style={{ color:'#fff', fontSize:20, fontWeight:900, margin:'0 0 22px', textAlign:'center' }}>
            {tx.title}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:14 }}>

            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:7, letterSpacing:'0.03em' }}>{tx.slug}</label>
              <div style={{ position:'relative' }}>
                <Building2 size={16} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#FF6600', pointerEvents:'none' }}/>
                <input type="text" placeholder="plus-store"
                  {...register('slug', { required: tx.slugRequired })}
                  style={{ ...inp, paddingLeft:40 }}
                  onFocus={e => e.target.style.borderColor='#FF6600'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}
                />
              </div>
              {errors.slug && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>{errors.slug.message}</p>}
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, margin:'4px 0 0' }}>
                {tx.example}: <span style={{ color:'#FF6600', fontFamily:'monospace' }}>plus-store</span>
              </p>
            </div>

            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:7 }}>{tx.email}</label>
              <input type="email" placeholder="ou@entreprise.ht"
                {...register('email', { required: tx.emailRequired, pattern:{ value:/^\S+@\S+$/, message: tx.emailInvalid } })}
                style={inp}
                onFocus={e => e.target.style.borderColor='#FF6600'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}
              />
              {errors.email && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:7 }}>{tx.password}</label>
              <div style={{ position:'relative' }}>
                <input type={show ? 'text' : 'password'} placeholder="••••••••"
                  {...register('password', { required: tx.passRequired })}
                  style={{ ...inp, paddingRight:44 }}
                  onFocus={e => e.target.style.borderColor='#FF6600'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}
                />
                <button type="button" onClick={() => setShow(!show)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', display:'flex', padding:0 }}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {errors.password && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px', borderRadius:12, marginTop:6,
              background: loading ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg,#FF6600,#FF8C33)',
              color:'#fff', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight:900, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow: loading ? 'none' : '0 6px 24px rgba(255,102,0,0.5)',
              transition:'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { if(!loading) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 32px rgba(255,102,0,0.6)' }}}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=loading?'none':'0 6px 24px rgba(255,102,0,0.5)' }}
            >
              {loading
                ? <><div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>{tx.loading}</>
                : <><LogIn size={18}/>{tx.submit}</>
              }
            </button>
          </form>

          <div style={{ marginTop:18, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, textAlign:'center', margin:0, fontFamily:'monospace', lineHeight:1.7 }}>
              {tx.demo} → slug: <span style={{ color:'#FF6600' }}>plus-store</span>{' · '}
              email: <span style={{ color:'#FF6600' }}>admin@plusstore.ht</span>{' · '}
              mdp: <span style={{ color:'#FF6600' }}>PlusStore2024!</span>
            </p>
          </div>

          <p style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.4)', margin:'14px 0 0' }}>
            {tx.forgot}{' '}
            <button style={{ background:'none', border:'none', cursor:'pointer', color:'#FF6600', textDecoration:'underline', fontSize:12, padding:0 }}>{tx.reset}</button>
          </p>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.3)', margin:'18px 0 0' }}>
          © 2026 PLUS GROUP — Innov@tion & Tech. Tout dwa rezève.
        </p>
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        * { box-sizing:border-box }
        ::placeholder { color:rgba(255,255,255,0.35) !important }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus { 
          -webkit-box-shadow:0 0 0 30px rgba(20,15,60,0.8) inset !important; 
          -webkit-text-fill-color:#FFFFFF !important;
          caret-color:#FF6600 !important;
        }
        input { color:#FFFFFF !important; }
      `}</style>
    </div>
  )
}
