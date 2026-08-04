// src/pages/auth/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Building2, Globe, ChevronDown, WifiOff, UserPlus, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
// ✅ NOUVO — Login offline
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { saveOfflineCredentials, tryOfflineLogin } from '../../services/offlineAuth'

// ✅ KOREKSYON: fichye yo nan /public/assets/ — pa itilize import
// Vite pa konpile fichye public — yo aksesib dirèkteman kòm URL string
const bannerImg = '/assets/banner.webp'
const logoImg   = '/assets/logo.webp'

// ✅ NOUVO — Sonje slug/email (PA modpas, pou rezon sekirite) pou fasilite relogin
// sou POS ki gen tandans efase sesyon apre yo fèmen (batri/memwa optimizasyon)
const REMEMBER_SLUG_KEY  = 'plusgroup-remember-slug'
const REMEMBER_EMAIL_KEY = 'plusgroup-remember-email'

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

export default function LoginPage() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth, autoSetBranch } = useAuthStore()

  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [showLang, setShowLang] = useState(false)
  // ⚠️ NOUVO — Enskripsyon otonòm (antrepriz ka enskri tèt yo, mande kòd pwomo ajan)
  const [mode, setMode]           = useState('login') // 'login' | 'signup'
  const [signupLoading, setSignupLoading] = useState(false)
  const {
    register: registerS, handleSubmit: handleSubmitS,
    formState: { errors: errorsS }, watch: watchS, reset: resetS,
  } = useForm()
  const { i18n } = useTranslation()
  // ✅ NOUVO — Login offline
  const { isOnline } = useNetworkStatus()

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
    // ✅ NOUVO — Si pa gen paramèt nan URL la, itilize valè sonje yo (localStorage)
    const rememberedSlug  = localStorage.getItem(REMEMBER_SLUG_KEY)
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY)

    if (slugParam)            setValue('slug', slugParam)
    else if (rememberedSlug)  setValue('slug', rememberedSlug)

    if (emailParam)            setValue('email', emailParam)
    else if (rememberedEmail)  setValue('email', rememberedEmail)
  }, [searchParams, setValue])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const slug = data.slug.trim().toLowerCase()

      // ✅ NOUVO — Si PA gen entènèt, eseye login OFFLINE ak anprint sove a
      // (sesyon dènye fwa moun sa a te konekte AN LIY sou aparèy sa a)
      if (!isOnline) {
        const result = await tryOfflineLogin({ slug, email: data.email, password: data.password })

        if (result.success) {
          localStorage.setItem('plusgroup-slug', slug)
          api.defaults.headers.common['X-Tenant-Slug'] = slug
          api.defaults.headers.common['Authorization'] = 'Bearer ' + result.token

          setAuth(result.token, result.user, result.tenant)

          localStorage.setItem(REMEMBER_SLUG_KEY, slug)
          localStorage.setItem(REMEMBER_EMAIL_KEY, data.email.trim().toLowerCase())

          toast.success(`📴 Konekte offline — Byenvini ${result.user.fullName || result.user.email}!`, { duration: 5000 })
          navigate('/dashboard')
        } else if (result.reason === 'no-cache') {
          toast.error('Pa gen sesyon lokal pou kont sa a sou aparèy sa a. Konekte omwen yon fwa pandan w an liy anvan.', { duration: 6000 })
        } else {
          toast.error('Modpas pa kòrèk.')
        }
        setLoading(false)
        return
      }

      // ─── Online — kontinye jan sa te ye a ───
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

      // ✅ NOUVO — Sove anprint pou pèmèt login offline pita (JANM modpas an klè)
      saveOfflineCredentials({ slug, email: data.email, password: data.password, token, user, tenant }).catch(() => {})

      // ✅ Sonje slug/email pou fasilite relogin pwochen fwa
      // (PA modpas — nou pa janm sove sa pou rezon sekirite)
      localStorage.setItem(REMEMBER_SLUG_KEY, slug)
      localStorage.setItem(REMEMBER_EMAIL_KEY, data.email.trim().toLowerCase())

      const branches = res.data.branches || []
      autoSetBranch(branches)

      toast.success('Byenvini , ' + user.fullName + '! 🎉')
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

  // ⚠️ NOUVO — Enskripsyon otonòm antrepriz (piblik, mande kòd pwomo ajan valid)
  const onSignupSubmit = async (data) => {
    setSignupLoading(true)
    try {
      const cleanSlug = (data.slug || data.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const res = await api.post('/public/tenant-signup', {
        name: data.name.trim(),
        slug: cleanSlug,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        promoCode: data.promoCode.trim(),
        adminName: data.adminName || null,
        adminEmail: data.adminEmail.trim(),
        adminPassword: data.adminPassword,
      })
      toast.success(res.data.message || 'Enskripsyon resevwa!', { duration: 7000 })
      resetS()
      setMode('login')
      setValue('slug', cleanSlug)
      setValue('email', data.adminEmail.trim())
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erè pandan enskripsyon an.')
    } finally {
      setSignupLoading(false)
    }
  }

  const inp = {
    width:'100%', padding:'11px 14px', borderRadius:10,
    border:'1.5px solid rgba(255,255,255,0.25)', outline:'none',
    background:'rgba(20,15,60,0.55)', color:'#FFFFFF',
    WebkitTextFillColor:'#FFFFFF',
    fontSize:14, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box',
    transition:'border-color 0.2s', caretColor:'#FF6600',
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16, position:'relative', overflow:'hidden', fontFamily:'DM Sans, sans-serif' }}>

      <div style={{
        position:'absolute', inset:0, zIndex:0,
        backgroundImage:`url(${bannerImg})`,
        backgroundSize:'cover', backgroundPosition:'center',
        filter:'brightness(0.45)',
      }}/>

      <div style={{
        position:'absolute', inset:0, zIndex:0,
        background:'linear-gradient(135deg, rgba(26,20,100,0.75) 0%, rgba(180,60,0,0.55) 100%)',
      }}/>

      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, zIndex:3, background:'linear-gradient(90deg,transparent,#FF6600,#FFD700,#FF6600,transparent)' }}/>

      <div id="login-lang" style={{ position:'fixed', top:16, right:16, zIndex:50 }}>
        <button onClick={() => setShowLang(!showLang)} style={{
          display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:12,
          border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.1)',
          color:'rgba(255,255,255,0.9)', cursor:'pointer', fontSize:12, fontWeight:700,
        }}>
          <Globe size={14}/>
          <span style={{ fontSize:15 }}>{currentLang.flag}</span>
          <span style={{ fontSize:11 }}>{currentLang.code.toUpperCase()}</span>
          <ChevronDown size={12} style={{ transform: showLang ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
        </button>
        {showLang && (
          <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'rgba(10,10,40,0.97)', borderRadius:12, minWidth:170, boxShadow:'0 16px 48px rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.15)', overflow:'hidden' }}>
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

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:5 }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src={logoImg} alt="PLUS GROUP Logo"
            style={{ height:90, width:'auto', marginBottom:12, filter:'drop-shadow(0 4px 20px rgba(255,102,0,0.5))' }}
          />
          <h1 style={{ color:'#fff', fontSize:32, fontWeight:900, margin:'0 0 4px', textShadow:'0 2px 12px rgba(0,0,0,0.5)' }}>PLUS GROUP</h1>
          <p style={{ color:'#FF6600', fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', margin:0 }}>
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
            {mode === 'login' ? tx.title : 'Enskri Antrepriz Ou'}
          </h2>

          {mode === 'login' ? (
            <>
              {/* ✅ NOUVO — Endikatè Mòd Offline (login lokal disponib) */}
              {!isOnline && (
                <div style={{
                  display:'flex', alignItems:'center', gap:8, justifyContent:'center',
                  padding:'8px 14px', marginBottom:16, borderRadius:10,
                  background:'rgba(217,119,6,0.15)', border:'1px solid rgba(217,119,6,0.4)',
                }}>
                  <WifiOff size={14} color="#FBBF24"/>
                  <span style={{ fontSize:11, color:'#FBBF24', fontWeight:700 }}>
                    Mòd Offline — Login lokal (dènye sesyon konekte)
                  </span>
                </div>
              )}

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
                    <button type="button" onClick={() => setShow(!show)} style={{
                      position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', display:'flex', padding:0,
                    }}>
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
                }}>
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
                <button style={{ background:'none', border:'none', cursor:'pointer', color:'#FF6600', textDecoration:'underline', fontSize:12, padding:0 }}>
                  {tx.reset}
                </button>
              </p>

              <p style={{ textAlign:'center', fontSize:12.5, color:'rgba(255,255,255,0.55)', margin:'18px 0 0', paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.12)' }}>
                Poko gen kont?{' '}
                <button onClick={() => setMode('signup')} style={{ background:'none', border:'none', cursor:'pointer', color:'#FF6600', fontWeight:700, fontSize:12.5, padding:0, display:'inline-flex', alignItems:'center', gap:4 }}>
                  <UserPlus size={13}/> Enskri antrepriz ou
                </button>
              </p>
            </>
          ) : (
            <>
              <button onClick={() => setMode('login')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:600, marginBottom:16, padding:0 }}>
                <ArrowLeft size={14}/> Tounen sou koneksyon
              </button>

              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, textAlign:'center', margin:'0 0 18px', lineHeight:1.6 }}>
                Ou gen yon mwa pou itilize sistèm nan. Apre yon mwa itilizasyon, ou dwe peye pou kontinye itilize l.
              </p>

              <form onSubmit={handleSubmitS(onSignupSubmit)} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>NON ANTREPRIZ *</label>
                  <input type="text" placeholder="Boutik Marie"
                    {...registerS('name', { required: true })}
                    style={inp}
                    onFocus={e => e.target.style.borderColor='#FF6600'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}
                  />
                  {errorsS.name && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>Non antrepriz obligatwa</p>}
                </div>

                <div>
                  <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>SLUG (adrès kout)</label>
                  <input type="text" placeholder={watchS('name') ? watchS('name').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') : 'boutik-marie'}
                    {...registerS('slug')}
                    style={inp}
                    onFocus={e => e.target.style.borderColor='#FF6600'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}
                  />
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>TELEFÒN</label>
                    <input type="text" placeholder="+509 XXXX XXXX" {...registerS('phone')} style={inp}
                      onFocus={e => e.target.style.borderColor='#FF6600'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>ADRÈS</label>
                    <input type="text" placeholder="Vil, Depatman" {...registerS('address')} style={inp}
                      onFocus={e => e.target.style.borderColor='#FF6600'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}/>
                  </div>
                </div>

                <div>
                  <label style={{ display:'block', color:'#FFB347', fontSize:12, fontWeight:800, marginBottom:6 }}>KÒD PWOMO AJAN *</label>
                  <input type="text" placeholder="Antre kòd la isit"
                    {...registerS('promoCode', { required: true })}
                    style={{ ...inp, borderColor:'rgba(255,179,71,0.4)', textTransform:'uppercase' }}
                    onFocus={e => e.target.style.borderColor='#FF6600'}
                    onBlur={e => e.target.style.borderColor='rgba(255,179,71,0.4)'}
                  />
                  {errorsS.promoCode && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>Kòd pwomo yon ajan obligatwa</p>}
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, margin:'4px 0 0' }}>Mande kòd sa a nan men ajan ki envite w la</p>
                </div>

                <div style={{ borderTop:'1px solid rgba(255,255,255,0.12)', paddingTop:12, marginTop:2 }}>
                  <p style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.55)', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Kont Administratè</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div>
                      <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>NON ADMINISTRATÈ</label>
                      <input type="text" placeholder="Marie Jean" {...registerS('adminName')} style={inp}
                        onFocus={e => e.target.style.borderColor='#FF6600'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}/>
                    </div>
                    <div>
                      <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>IMÈL KONEKSYON *</label>
                      <input type="email" placeholder="marie@entreprise.ht"
                        {...registerS('adminEmail', { required: true, pattern: /^\S+@\S+$/ })}
                        style={inp}
                        onFocus={e => e.target.style.borderColor='#FF6600'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}/>
                      {errorsS.adminEmail && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>Yon imèl valid obligatwa</p>}
                    </div>
                    <div>
                      <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>MODPAS *</label>
                      <input type="password" placeholder="Omwen 6 karaktè"
                        {...registerS('adminPassword', { required: true, minLength: 6 })}
                        style={inp}
                        onFocus={e => e.target.style.borderColor='#FF6600'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.25)'}/>
                      {errorsS.adminPassword && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>Omwen 6 karaktè</p>}
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={signupLoading} style={{
                  width:'100%', padding:'13px', borderRadius:12, marginTop:6,
                  background: signupLoading ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg,#FF6600,#FF8C33)',
                  color:'#fff', border:'none', cursor: signupLoading ? 'not-allowed' : 'pointer',
                  fontWeight:900, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: signupLoading ? 'none' : '0 6px 24px rgba(255,102,0,0.5)',
                }}>
                  {signupLoading
                    ? <><div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>Ap enskri...</>
                    : <><UserPlus size={18}/>Kreye Kont Lan</>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.3)', margin:'18px 0 0' }}>
          © 2026 PLUS GROUP — Innov@tion & Tech. Tout dwa rezève.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box }
        ::placeholder { color: rgba(255,255,255,0.35) !important }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 30px rgba(20,15,60,0.8) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
          caret-color: #FF6600 !important;
        }
        input { color: #FFFFFF !important; }
      `}</style>
    </div>
  )
}