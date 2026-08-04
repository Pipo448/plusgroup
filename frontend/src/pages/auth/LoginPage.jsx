// src/pages/auth/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Building2, Globe, ChevronDown, ChevronRight, WifiOff, UserPlus, ArrowLeft, Mail, Lock, ShieldCheck, Lightbulb, Cpu, ShoppingCart, Headphones } from 'lucide-react'
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
// ⚠️ NOUVO — Imaj antye (san koupe) pou vèsyon desktop ak mobil paj Login la
const bgDesktop = '/assets/login-bg-desktop.png'
const bgMobile  = '/assets/login-bg-mobile.png'

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
    width:'100%', padding:'13px 14px', borderRadius:12,
    border:'1.5px solid rgba(255,255,255,0.12)', outline:'none',
    background:'rgba(0,0,0,0.28)', color:'#FFFFFF',
    WebkitTextFillColor:'#FFFFFF',
    fontSize:14, fontFamily:'DM Sans, sans-serif', boxSizing:'border-box',
    transition:'border-color 0.2s, box-shadow 0.2s', caretColor:'#E8C468',
  }
  const focusGold = e => { e.target.style.borderColor='#E8C468'; e.target.style.boxShadow='0 0 0 3px rgba(232,196,104,0.15)' }
  const blurGold  = e => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.boxShadow='none' }

  // ⚠️ NOUVO — Si slug deja sonje (localStorage), pa montre chan slug la ditou
  // (pou match egzat ak mokèt la, ki gen sèl 2 chan: imèl + modpas)
  // Estil chan reyèl — fon SOLID (opak) pou kouvri konplètman tèks/plasholder
  // ki te deja "grave" sou imaj la (sinon ekriti kliyan an ta monte sou li)
  const ghostInp = {
    position:'absolute', boxSizing:'border-box', outline:'none', border:'1.5px solid rgba(255,255,255,0.12)',
    background:'#15151d', color:'#fff', WebkitTextFillColor:'#fff',
    fontFamily:'DM Sans, sans-serif', borderRadius:12,
    padding:'0 14px', transition:'border-color 0.15s',
  }
  const ghostFocus = focusGold
  const ghostBlur  = blurGold

  // ⚠️ NOUVO — Chanjman lang, kounye a mare sou kat/imaj la (pa sou tout vyewport
  // la), pou l pa "flote" lwen kat la sou gwo ekran e li rete pwofesyonèl.
  const LangSwitcher = ({ top, right, compact }) => (
    <div id="login-lang" style={{ position:'absolute', top, right, zIndex:50 }}>
      <button onClick={() => setShowLang(!showLang)} style={{
        display:'flex', alignItems:'center', gap:6, padding: compact ? '5px 10px' : '7px 14px', borderRadius:10,
        border:'1px solid rgba(255,255,255,0.18)', background:'rgba(10,10,18,0.55)', backdropFilter:'blur(6px)',
        color:'rgba(255,255,255,0.9)', cursor:'pointer', fontSize:11, fontWeight:700,
      }}>
        <Globe size={12}/>
        <span style={{ fontSize:13 }}>{currentLang.flag}</span>
        {!compact && <span style={{ fontSize:10 }}>{currentLang.code.toUpperCase()}</span>}
        <ChevronDown size={10} style={{ transform: showLang ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
      </button>
      {showLang && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'rgba(10,10,40,0.97)', borderRadius:12, minWidth:160, boxShadow:'0 16px 48px rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.15)', overflow:'hidden' }}>
          {LANGS.map(lang => (
            <button key={lang.code} onClick={() => changeLanguage(lang.code)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', cursor:'pointer',
              background: i18n.language === lang.code ? 'rgba(232,196,104,0.15)' : 'transparent',
              color: i18n.language === lang.code ? '#E8C468' : 'rgba(255,255,255,0.75)',
              fontWeight: i18n.language === lang.code ? 700 : 400, fontSize:12.5,
              borderBottom:'1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize:16 }}>{lang.flag}</span>
              <span style={{ flex:1, textAlign:'left' }}>{lang.name}</span>
              {i18n.language === lang.code && <span style={{ color:'#E8C468' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="pg-login-shell" style={{ minHeight:'100vh', position:'relative', fontFamily:'DM Sans, sans-serif', background:'#0A0A12' }}>

      {!isOnline && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'8px 14px', background:'rgba(217,119,6,0.95)' }}>
          <WifiOff size={14} color="#fff"/>
          <span style={{ fontSize:12, color:'#fff', fontWeight:700 }}>Mòd Offline — Login lokal (dènye sesyon konekte)</span>
        </div>
      )}

      {mode === 'login' ? (
        <>
          {/* ═══ VÈSYON DESKTOP — imaj ak espas vid, fòm konplè ak lejand ═══ */}
          <div className="pg-bg-desktop" style={{ position:'relative', width:'100%', maxWidth:1402, margin:'0 auto' }}>
            <img src={bgDesktop} alt="Plus Group" style={{ width:'100%', height:'auto', display:'block' }} draggable={false}/>
            <LangSwitcher top={16} right={16}/>
            <form onSubmit={handleSubmit(onSubmit)} style={{ position:'absolute', inset:0 }}>
              <label style={{ position:'absolute', left:'59.8%', top:'48.3%', color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>{tx.slug.toUpperCase()}</label>
              <Building2 size={15} style={{ position:'absolute', left:'61%', top:'53.3%', transform:'translateY(-50%)', color:'#E8C468', pointerEvents:'none', zIndex:1 }}/>
              <input type="text" placeholder="plus-store"
                {...register('slug', { required: tx.slugRequired })}
                style={{ ...ghostInp, left:'59.8%', top:'51%', width:'33%', height:'4.5%', fontSize:13.5, paddingLeft:36 }}
                onFocus={ghostFocus} onBlur={ghostBlur}
              />
              {errors.slug && <p style={{ position:'absolute', left:'59.8%', top:'55.7%', color:'#FFB347', fontSize:10, margin:0 }}>{errors.slug.message}</p>}

              <label style={{ position:'absolute', left:'59.8%', top:'58.3%', color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>{tx.email.toUpperCase()}</label>
              <Mail size={15} style={{ position:'absolute', left:'61%', top:'63.3%', transform:'translateY(-50%)', color:'#E8C468', pointerEvents:'none', zIndex:1 }}/>
              <input type="email" placeholder="ou@antrepriz.ht"
                {...register('email', { required: tx.emailRequired, pattern:{ value:/^\S+@\S+$/, message: tx.emailInvalid } })}
                style={{ ...ghostInp, left:'59.8%', top:'61%', width:'33%', height:'4.5%', fontSize:13.5, paddingLeft:36 }}
                onFocus={ghostFocus} onBlur={ghostBlur}
              />

              <label style={{ position:'absolute', left:'59.8%', top:'68.3%', color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>{tx.password.toUpperCase()}</label>
              <div style={{ position:'relative' }}>
                <Lock size={15} style={{ position:'absolute', left:'61%', top:'73.3%', transform:'translateY(-50%)', color:'#E8C468', pointerEvents:'none', zIndex:1 }}/>
                <input type={show ? 'text' : 'password'} placeholder="••••••••"
                  {...register('password', { required: tx.passRequired })}
                  style={{ ...ghostInp, left:'59.8%', top:'71%', width:'33%', height:'4.5%', fontSize:13.5, paddingLeft:36, paddingRight:34 }}
                  onFocus={ghostFocus} onBlur={ghostBlur}
                />
                <button type="button" onClick={() => setShow(!show)} style={{ position:'absolute', left:'89%', top:'73.3%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', padding:0, zIndex:1, display:'flex' }}>
                  {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>

              <label style={{ position:'absolute', left:'59.8%', top:'77.5%', display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.65)', fontSize:11.5, cursor:'pointer' }}>
                <input type="checkbox" style={{ width:13, height:13, margin:0, accentColor:'#E8C468', cursor:'pointer' }}/>
                Sonje mwen
              </label>
              <button type="button" style={{ position:'absolute', left:'80%', top:'77.5%', width:'12.5%', background:'none', border:'none', color:'#E8C468', fontSize:11.5, cursor:'pointer', textAlign:'right', padding:0 }}>{tx.forgot}</button>

              <button type="submit" disabled={loading} style={{
                position:'absolute', left:'59.8%', top:'81.5%', width:'33%', height:'6%', borderRadius:10,
                background: loading ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#F5D889,#E8A94A)',
                color: loading ? '#fff' : '#1A1408', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow: loading ? 'none' : '0 8px 20px rgba(232,169,74,0.3)',
              }}>
                {loading
                  ? <div style={{ width:16, height:16, border:'2px solid rgba(0,0,0,0.25)', borderTopColor:'#1A1408', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
                  : <>{tx.submit}<ChevronRight size={16}/></>
                }
              </button>

              <p style={{ position:'absolute', left:'59.8%', top:'89.5%', width:'33%', textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:12, margin:0 }}>
                Poko gen kont?{' '}
                <button type="button" onClick={() => setMode('signup')} style={{ background:'none', border:'none', color:'#F5680C', fontWeight:700, fontSize:12, cursor:'pointer', padding:0 }}>Kreye youn</button>
              </p>
            </form>
          </div>

          {/* ═══ VÈSYON MOBIL — imaj ak espas vid, fòm konplè ak lejand ═══ */}
          <div className="pg-bg-mobile" style={{ position:'relative', width:'100%', maxWidth:480, margin:'0 auto' }}>
            <img src={bgMobile} alt="Plus Group" style={{ width:'100%', height:'auto', display:'block' }} draggable={false}/>
            <LangSwitcher top={10} right={10} compact/>
            <form onSubmit={handleSubmit(onSubmit)} style={{ position:'absolute', inset:0 }}>
              <label style={{ position:'absolute', left:'9.1%', top:'56.5%', color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>{tx.slug.toUpperCase()}</label>
              <Building2 size={15} style={{ position:'absolute', left:'11.5%', top:'60.7%', transform:'translateY(-50%)', color:'#E8C468', pointerEvents:'none', zIndex:1 }}/>
              <input type="text" placeholder="plus-store"
                {...register('slug', { required: tx.slugRequired })}
                style={{ ...ghostInp, left:'9.1%', top:'58.7%', width:'81.7%', height:'4.0%', fontSize:14, paddingLeft:36 }}
                onFocus={ghostFocus} onBlur={ghostBlur}
              />
              {errors.slug && <p style={{ position:'absolute', left:'9.1%', top:'63%', color:'#FFB347', fontSize:10, margin:0 }}>{errors.slug.message}</p>}

              <label style={{ position:'absolute', left:'9.1%', top:'65.5%', color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>{tx.email.toUpperCase()}</label>
              <Mail size={15} style={{ position:'absolute', left:'11.5%', top:'69.7%', transform:'translateY(-50%)', color:'#E8C468', pointerEvents:'none', zIndex:1 }}/>
              <input type="email" placeholder="ou@antrepriz.ht"
                {...register('email', { required: tx.emailRequired, pattern:{ value:/^\S+@\S+$/, message: tx.emailInvalid } })}
                style={{ ...ghostInp, left:'9.1%', top:'67.7%', width:'81.7%', height:'4.0%', fontSize:14, paddingLeft:36 }}
                onFocus={ghostFocus} onBlur={ghostBlur}
              />

              <label style={{ position:'absolute', left:'9.1%', top:'74.5%', color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>{tx.password.toUpperCase()}</label>
              <Lock size={15} style={{ position:'absolute', left:'11.5%', top:'78.7%', transform:'translateY(-50%)', color:'#E8C468', pointerEvents:'none', zIndex:1 }}/>
              <input type={show ? 'text' : 'password'} placeholder="••••••••"
                {...register('password', { required: tx.passRequired })}
                style={{ ...ghostInp, left:'9.1%', top:'76.7%', width:'81.7%', height:'4.0%', fontSize:14, paddingLeft:36, paddingRight:34 }}
                onFocus={ghostFocus} onBlur={ghostBlur}
              />
              <button type="button" onClick={() => setShow(!show)} style={{ position:'absolute', left:'88%', top:'78.7%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', padding:0, zIndex:1, display:'flex' }}>
                {show ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>

              <label style={{ position:'absolute', left:'9.1%', top:'83.3%', display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.65)', fontSize:12, cursor:'pointer' }}>
                <input type="checkbox" style={{ width:14, height:14, margin:0, accentColor:'#E8C468', cursor:'pointer' }}/>
                Sonje mwen
              </label>
              <button type="button" style={{ position:'absolute', left:'62%', top:'83.3%', width:'29%', background:'none', border:'none', color:'#E8C468', fontSize:12, cursor:'pointer', textAlign:'right', padding:0 }}>{tx.forgot}</button>

              <button type="submit" disabled={loading} style={{
                position:'absolute', left:'9.1%', top:'87%', width:'81.7%', height:'5.5%', borderRadius:10,
                background: loading ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#F5D889,#E8A94A)',
                color: loading ? '#fff' : '#1A1408', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight:800, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow: loading ? 'none' : '0 8px 20px rgba(232,169,74,0.3)',
              }}>
                {loading
                  ? <div style={{ width:18, height:18, border:'2px solid rgba(0,0,0,0.25)', borderTopColor:'#1A1408', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
                  : <>{tx.submit}<ChevronRight size={17}/></>
                }
              </button>

              <p style={{ position:'absolute', left:'9.1%', top:'93.5%', width:'81.7%', textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:13, margin:0 }}>
                Poko gen kont?{' '}
                <button type="button" onClick={() => setMode('signup')} style={{ background:'none', border:'none', color:'#F5680C', fontWeight:700, fontSize:13, cursor:'pointer', padding:0 }}>Kreye youn</button>
              </p>
            </form>
          </div>
        </>
      ) : (
        <div style={{ position:'relative', zIndex:5, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{
            position:'absolute', inset:0, zIndex:-1,
            backgroundImage:`url(${bannerImg})`, backgroundSize:'cover', backgroundPosition:'center', filter:'brightness(0.38)',
          }}/>
          <div style={{ position:'absolute', inset:0, zIndex:-1, background:'linear-gradient(115deg, rgba(6,8,20,0.92) 0%, rgba(20,12,10,0.75) 55%, rgba(60,25,5,0.55) 100%)' }}/>
          <LangSwitcher top={16} right={16}/>

          <div style={{ width:'100%', maxWidth:420 }}>
            <div style={{
              borderRadius:24, padding:32,
              background:'linear-gradient(180deg, rgba(16,16,26,0.92), rgba(10,10,16,0.96))',
              backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
              border:'1.5px solid rgba(232,196,104,0.35)',
              boxShadow:'0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ display:'inline-flex', alignItems:'baseline', fontSize:26, fontWeight:900, letterSpacing:'-0.01em' }}>
                  <span style={{ color:'#3B5FCC' }}>PLUS</span>
                  <span style={{ color:'#E8C468', margin:'0 3px', fontSize:22 }}>✛</span>
                  <span style={{ color:'#F5680C' }}>GROUP</span>
                </div>
              </div>

              <button onClick={() => setMode('login')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:600, marginBottom:16, padding:0 }}>
                <ArrowLeft size={14}/> Tounen sou koneksyon
              </button>

              <h2 style={{ color:'#E8C468', fontSize:19, fontWeight:900, margin:'0 0 10px', textAlign:'center' }}>Enskri Antrepriz Ou</h2>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, textAlign:'center', margin:'0 0 18px', lineHeight:1.6 }}>
                Ou gen yon mwa pou itilize sistèm nan. Apre yon mwa itilizasyon, ou dwe peye pou kontinye itilize l.
              </p>

              <form onSubmit={handleSubmitS(onSignupSubmit)} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>NON ANTREPRIZ *</label>
                  <input type="text" placeholder="Boutik Marie"
                    {...registerS('name', { required: true })}
                    style={inp}
                    onFocus={focusGold}
                    onBlur={blurGold}
                  />
                  {errorsS.name && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>Non antrepriz obligatwa</p>}
                </div>

                <div>
                  <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>SLUG (adrès kout)</label>
                  <input type="text" placeholder={watchS('name') ? watchS('name').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') : 'boutik-marie'}
                    {...registerS('slug')}
                    style={inp}
                    onFocus={focusGold}
                    onBlur={blurGold}
                  />
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>TELEFÒN</label>
                    <input type="text" placeholder="+509 XXXX XXXX" {...registerS('phone')} style={inp}
                      onFocus={focusGold} onBlur={blurGold}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>ADRÈS</label>
                    <input type="text" placeholder="Vil, Depatman" {...registerS('address')} style={inp}
                      onFocus={focusGold} onBlur={blurGold}/>
                  </div>
                </div>

                <div>
                  <label style={{ display:'block', color:'#FFB347', fontSize:12, fontWeight:800, marginBottom:6 }}>KÒD PWOMO AJAN *</label>
                  <input type="text" placeholder="Antre kòd la isit"
                    {...registerS('promoCode', { required: true })}
                    style={{ ...inp, paddingLeft:14, borderColor:'rgba(232,196,104,0.4)', textTransform:'uppercase' }}
                    onFocus={focusGold}
                    onBlur={e => { e.target.style.borderColor='rgba(232,196,104,0.4)'; e.target.style.boxShadow='none' }}
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
                        onFocus={focusGold} onBlur={blurGold}/>
                    </div>
                    <div>
                      <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>IMÈL KONEKSYON *</label>
                      <input type="email" placeholder="marie@entreprise.ht"
                        {...registerS('adminEmail', { required: true, pattern: /^\S+@\S+$/ })}
                        style={inp}
                        onFocus={focusGold} onBlur={blurGold}/>
                      {errorsS.adminEmail && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>Yon imèl valid obligatwa</p>}
                    </div>
                    <div>
                      <label style={{ display:'block', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:700, marginBottom:6 }}>MODPAS *</label>
                      <input type="password" placeholder="Omwen 6 karaktè"
                        {...registerS('adminPassword', { required: true, minLength: 6 })}
                        style={inp}
                        onFocus={focusGold} onBlur={blurGold}/>
                      {errorsS.adminPassword && <p style={{ color:'#FFB347', fontSize:11, margin:'4px 0 0' }}>Omwen 6 karaktè</p>}
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={signupLoading} style={{
                  width:'100%', padding:'13px', borderRadius:12, marginTop:6,
                  background: signupLoading ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#F5D889,#E8A94A)',
                  color: signupLoading ? '#fff' : '#1A1408', border:'none', cursor: signupLoading ? 'not-allowed' : 'pointer',
                  fontWeight:900, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: signupLoading ? 'none' : '0 8px 26px rgba(232,169,74,0.35)',
                }}>
                  {signupLoading
                    ? <><div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>Ap enskri...</>
                    : <><UserPlus size={18}/>Kreye Kont Lan</>
                  }
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box }
        ::placeholder { color: rgba(255,255,255,0.35) !important }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 30px rgba(20,15,60,0.8) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
          caret-color: #E8C468 !important;
        }
        input { color: #FFFFFF !important; }

        .pg-bg-mobile { display: none; }
        @media (max-width: 900px) {
          .pg-bg-desktop { display: none; }
          .pg-bg-mobile { display: block; }
        }
      `}</style>
    </div>
  )
}
