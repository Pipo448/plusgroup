// src/pages/auth/LoginPage.jsx
// ─── Design pwòp & lejè — 100% CSS/SVG, ZERO foto lou ────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Mail, Lock, Building2, Eye, EyeOff, Calendar, Users, FolderOpen, BarChart3, ShieldCheck, Heart } from 'lucide-react'

// ── Palèt klè (medikal / pwofesyonèl) ───────────────────────
const C = {
  navy:     '#0F2A6B',
  navyDeep: '#0A1A4A',
  blue:     '#2563EB',
  blueSoft: '#3B82F6',
  orange:   '#F97316',
  text:     '#1E293B',
  muted:    '#64748B',
  line:     '#E2E8F0',
  white:    '#FFFFFF',
}

// ── Logo SVG (kwa medikal ak ring — san fichye imaj) ────────
function KlinikLogo({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 8 A42 42 0 1 1 16 30" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M50 8 A42 42 0 0 1 84 30" stroke="#F97316" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <rect x="40" y="24" width="20" height="52" rx="3" fill="#0F2A6B"/>
      <rect x="24" y="40" width="52" height="20" rx="3" fill="#0F2A6B"/>
    </svg>
  )
}

const FEATURES = [
  { icon: Calendar,   label: 'RANDEVOU',  desc: 'Planifye konsiltasyon yo fasil.',   color: '#F97316', bg: 'rgba(249,115,22,0.1)'  },
  { icon: Users,      label: 'PASYAN',    desc: 'Santralize done pasyan ou yo.',     color: '#14B8A6', bg: 'rgba(20,184,166,0.1)'  },
  { icon: FolderOpen, label: 'DOSYE',     desc: 'Aksè dosye medikal an sekirite.',   color: '#6366F1', bg: 'rgba(99,102,241,0.1)'  },
  { icon: BarChart3,  label: 'RAPÒ',      desc: 'Swiv pèfòmans, pran bon desizyon.', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)

  const [slug,     setSlug]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [remember, setRemember] = useState(false)

  const mutation = useMutation({
    mutationFn: async (data) => {
      api.defaults.headers.common['X-Tenant-Slug'] = data.slug
      const res = await api.post('/auth/login', {
        email:    data.email,
        password: data.password,
      })
      return res.data
    },
    onSuccess: (data) => {
      setAuth({ token: data.token, user: data.user, tenant: data.tenant })
      toast.success(`Byenveni, ${data.user?.fullName || 'Doktè'}!`)
      navigate('/dashboard', { replace: true })
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Email oswa modpas mal.')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!slug.trim())     { toast.error('Kòd klinik obligatwa.');  return }
    if (!email.trim())    { toast.error('Email obligatwa.');        return }
    if (!password.trim()) { toast.error('Modpas obligatwa.');       return }
    mutation.mutate({ slug: slug.trim(), email: email.trim(), password })
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }

        .lg-wrap {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #FFFFFF;
        }

        .lg-left { display: none; }

        .lg-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 28px 20px;
          position: relative;
          background: #FFFFFF;
        }

        .lg-mobile-head {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 26px;
          text-align: center;
        }

        .lg-card {
          width: 100%;
          max-width: 400px;
          animation: floatUp 0.5s ease both;
        }

        .lg-field { margin-bottom: 16px; }

        .lg-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: ${C.navy};
          margin-bottom: 7px;
        }

        .lg-inwrap { position: relative; }

        .lg-inwrap > svg.lg-icn {
          position: absolute;
          left: 15px; top: 50%;
          transform: translateY(-50%);
          color: ${C.muted};
          pointer-events: none;
        }

        .lg-input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          border-radius: 12px;
          border: 1.5px solid ${C.line};
          outline: none;
          background: #F8FAFC;
          color: ${C.text};
          font-size: 14px;
          font-family: inherit;
          transition: all 0.18s;
        }
        .lg-input::placeholder { color: #94A3B8; }
        .lg-input:focus {
          border-color: ${C.blue};
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.1);
        }

        .lg-eye {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          color: ${C.muted};
          display: flex; align-items: center;
          padding: 4px;
        }

        .lg-btn {
          width: 100%;
          padding: 15px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 20px rgba(37,99,235,0.3);
          transition: all 0.2s;
          margin-top: 6px;
        }
        .lg-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(37,99,235,0.4); }
        .lg-btn:disabled { opacity: 0.7; cursor: not-allowed; background: #93C5FD; box-shadow: none; }

        .lg-foot {
          text-align: center;
          font-size: 12px;
          color: ${C.muted};
          margin-top: 26px;
          line-height: 1.7;
        }

        /* ════════ DESKTOP (≥ 900px) ════════ */
        @media (min-width: 900px) {
          .lg-left {
            display: flex;
            flex-direction: column;
            width: 52%;
            position: relative;
            overflow: hidden;
            background: linear-gradient(160deg, #EAF2FD 0%, #D6E7FB 55%, #C2DBF7 100%);
            padding: 56px 56px 0;
          }

          .lg-left::before {
            content: '';
            position: absolute;
            top: -120px; right: -120px;
            width: 420px; height: 420px;
            border-radius: 50%;
            background: rgba(255,255,255,0.35);
          }
          .lg-left::after {
            content: '';
            position: absolute;
            bottom: 90px; left: -160px;
            width: 360px; height: 360px;
            border-radius: 50%;
            background: rgba(37,99,235,0.06);
          }

          .lg-mobile-head { display: none; }

          .lg-right { width: 48%; flex: none; }

          .lg-brand-row {
            display: flex; align-items: center; gap: 16px;
            position: relative; z-index: 2;
            animation: floatUp 0.5s ease both;
          }
          .lg-brand-row h1 { font-size: 26px; font-weight: 900; margin: 0; line-height: 1.1; }
          .lg-brand-row .lg-plus { color: ${C.orange}; }
          .lg-brand-row .lg-grp  { color: ${C.navy}; }
          .lg-brand-row .lg-tag  {
            font-size: 13px; font-weight: 700; color: ${C.blue};
            margin: 4px 0 0; letter-spacing: 0.02em;
          }

          .lg-hero {
            position: relative; z-index: 2;
            margin-top: 44px;
            animation: floatUp 0.6s ease 0.1s both;
          }
          .lg-hero h2 {
            font-size: 30px; font-weight: 900;
            color: ${C.navy}; margin: 0;
            line-height: 1.2; letter-spacing: -0.01em;
          }
          .lg-hero p {
            font-size: 15px; color: #475569;
            margin: 16px 0 0; line-height: 1.6;
            max-width: 440px;
          }

          .lg-feats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 36px;
            position: relative; z-index: 2;
            animation: floatUp 0.6s ease 0.2s both;
          }
          .lg-feat {
            background: rgba(255,255,255,0.75);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.9);
            border-radius: 16px;
            padding: 18px 16px;
            box-shadow: 0 4px 16px rgba(15,42,107,0.06);
          }
          .lg-feat-ic {
            width: 44px; height: 44px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 12px;
          }
          .lg-feat h3 {
            font-size: 13px; font-weight: 900; color: ${C.navy};
            margin: 0 0 5px; letter-spacing: 0.04em;
          }
          .lg-feat p { font-size: 12px; color: ${C.muted}; margin: 0; line-height: 1.45; }

          .lg-secure {
            display: flex; align-items: center; gap: 13px;
            margin-top: 30px; padding-bottom: 30px;
            position: relative; z-index: 2;
            animation: floatUp 0.6s ease 0.3s both;
          }
          .lg-secure-ic {
            width: 46px; height: 46px; border-radius: 13px;
            background: ${C.navy};
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .lg-secure h4 { font-size: 15px; font-weight: 800; color: ${C.navy}; margin: 0; }
          .lg-secure p  { font-size: 12px; color: ${C.muted}; margin: 2px 0 0; }

          .lg-bottom {
            margin: auto -56px 0;
            background: ${C.navyDeep};
            padding: 16px 56px;
            display: flex; align-items: center; gap: 10px;
            position: relative; z-index: 2;
          }
          .lg-bottom span { font-size: 12px; font-weight: 800; color: #fff; letter-spacing: 0.04em; }
          .lg-bottom .lg-hl { color: ${C.orange}; }
        }

        @media (min-width: 1200px) {
          .lg-left  { width: 56%; padding: 64px 72px 0; }
          .lg-right { width: 44%; }
          .lg-left .lg-bottom { margin-left: -72px; margin-right: -72px; padding-left: 72px; padding-right: 72px; }
          .lg-hero h2 { font-size: 34px; }
        }
      `}</style>

      <div className="lg-wrap">

        {/* ══ BÒ GÒCH — Branding (Desktop) ══ */}
        <div className="lg-left">
          <div className="lg-brand-row">
            <KlinikLogo size={62}/>
            <div>
              <h1><span className="lg-plus">Plus</span> <span className="lg-grp">Groupe Klinik</span></h1>
              <p className="lg-tag">Jere. Swaye. Pi byen.</p>
            </div>
          </div>

          <div className="lg-hero">
            <h2>Solisyon konplè pou<br/>etablisman sante ou</h2>
            <p>
              Plus Groupe Klinik se zouti tout-an-yon pou jere pasyan,
              randevou, dosye medikal ak rapò an tout senplisite ak sekirite.
            </p>
          </div>

          <div className="lg-feats">
            {FEATURES.map(f => {
              const Ic = f.icon
              return (
                <div className="lg-feat" key={f.label}>
                  <div className="lg-feat-ic" style={{ background: f.bg }}>
                    <Ic size={22} style={{ color: f.color }}/>
                  </div>
                  <h3>{f.label}</h3>
                  <p>{f.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="lg-secure">
            <div className="lg-secure-ic">
              <ShieldCheck size={24} color="#fff"/>
            </div>
            <div>
              <h4>Sekirize & Konfidansyèl</h4>
              <p>Sekirite done yo se priyorite nou.</p>
            </div>
          </div>

          <div className="lg-bottom">
            <Heart size={16} color="#fff" fill="#fff"/>
            <span>PLIS PASE YON SOLISYON, <span className="lg-hl">YON PATNÈ KONFYANS.</span></span>
          </div>
        </div>

        {/* ══ BÒ DWAT — Fòm ══ */}
        <div className="lg-right">
          <div className="lg-card">

            {/* Header branding pou mobile */}
            <div className="lg-mobile-head">
              <KlinikLogo size={58}/>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: '14px 0 2px', color: C.navy }}>
                <span style={{ color: C.orange }}>Plus</span> Groupe Klinik
              </h1>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.blue, margin: 0 }}>
                Jere. Swaye. Pi byen.
              </p>
            </div>

            <div style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: C.navy, margin: '0 0 6px' }}>
                Koneksyon
              </h2>
              <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                Byenveni nan Plus Groupe Klinik
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="lg-field">
                <label className="lg-label">Kòd Klinik (Slug)</label>
                <div className="lg-inwrap">
                  <Building2 size={17} className="lg-icn"/>
                  <input
                    className="lg-input"
                    placeholder="ex: klinik-bon-sante"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    autoComplete="organization"
                  />
                </div>
                <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0' }}>
                  Kòd antite medikal ou a — administratè a ba ou l
                </p>
              </div>

              <div className="lg-field">
                <label className="lg-label">Adrès Email</label>
                <div className="lg-inwrap">
                  <Mail size={17} className="lg-icn"/>
                  <input
                    type="email"
                    className="lg-input"
                    placeholder="Antre adrès email ou"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="lg-field">
                <label className="lg-label">Modpas</label>
                <div className="lg-inwrap">
                  <Lock size={17} className="lg-icn"/>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="lg-input"
                    style={{ paddingRight: 46 }}
                    placeholder="Antre modpas ou"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button type="button" className="lg-eye" onClick={() => setShowPwd(p => !p)} aria-label="Montre modpas">
                    {showPwd ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 22px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.text }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.blue }}
                  />
                  Sonje m
                </label>
              </div>

              <button type="submit" className="lg-btn" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                    Ap konekte...
                  </>
                ) : 'Se konekte'}
              </button>
            </form>

            <p className="lg-foot">
              © {new Date().getFullYear()} Plus Groupe Klinik. Tout dwa rezève.<br/>
              <span style={{ color: C.blue, fontWeight: 700 }}>Pwodwi pa Plus Group</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}