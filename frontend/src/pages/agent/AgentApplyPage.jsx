// src/pages/agent/AgentApplyPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  User, PenLine, Calendar, Phone, Mail, Home, MapPin, Map, Globe,
  Briefcase, ClipboardList, Users, CheckCircle2, Camera, CreditCard,
  ArrowLeft, ArrowRight, ShieldCheck, Lock, Loader2, X, Headphones,
  DollarSign, GraduationCap, Monitor, Star, ChevronDown
} from 'lucide-react'
import { agentApi } from '../../services/agentApi'
import PromoCarousel from '../../components/agent/PromoCarousel'

// ⚠️ Logo a nan public/assets/ — chemen dirèk, pa bezwen import
const LOGO_URL = '/assets/logo.webp'

const C = {
  navy: '#0F172A', navyLight: '#1E293B', navyPanel: '#14213D',
  orange: '#F97316', orangeDark: '#EA580C', orangeLight: '#FDBA74',
  white: '#FFFFFF', bg: '#F1F5F9', blue: '#2563EB', danger: '#EF4444',
  border: '#E2E8F0', textMuted: '#64748B'
}

const STEPS = [
  { key: 'personal',      label: 'Enfòmasyon Pèsonèl', sub: 'Idantite & kontak',        icon: User },
  { key: 'documents',     label: 'Dokiman',             sub: 'Foto & Pyès idantite',      icon: CreditCard },
  { key: 'domain',        label: 'Domèn',                sub: 'Chwa domèn ou yo',          icon: Briefcase },
  { key: 'evaluation',    label: 'Evalyasyon',           sub: 'Kesyon selon domèn',        icon: ClipboardList },
  { key: 'references',    label: 'Referans',              sub: 'Moun ki ka bay referans',   icon: Users },
  { key: 'confirmation',  label: 'Konfimasyon',           sub: 'Revizyon & soumèt',         icon: CheckCircle2 },
]

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 960)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 960)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) { reject(new Error('Fichye a twò gwo (max 2MB).')); return }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const Field = ({ label, required, children, hint }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
      {label} {required && <span style={{ color: C.danger }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontSize: 11, color: C.textMuted, margin: '4px 0 0' }}>{hint}</p>}
  </div>
)

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`,
  outline: 'none', fontSize: 14, color: C.navy, background: C.white, boxSizing: 'border-box', fontFamily: 'inherit'
}

const TextInput = (props) => <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />
const TextArea  = (props) => <textarea {...props} rows={props.rows || 3} style={{ ...inputStyle, resize: 'vertical', ...(props.style || {}) }} />
const Select = ({ children, ...props }) => (
  <div style={{ position: 'relative' }}>
    <select {...props} style={{ ...inputStyle, appearance: 'none', paddingRight: 36, ...(props.style || {}) }}>{children}</select>
    <ChevronDown size={15} color={C.textMuted} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
  </div>
)

const IconInput = ({ icon: Icon, ...props }) => (
  <div style={{ position: 'relative' }}>
    <Icon size={15} color={C.textMuted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
    <input {...props} style={{ ...inputStyle, paddingLeft: 38 }} />
  </div>
)

const CheckboxGroup = ({ options, values, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
    {options.map(opt => {
      const checked = (values || []).includes(opt)
      return (
        <label key={opt} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
          border: `1.5px solid ${checked ? C.orange : C.border}`, background: checked ? '#FFF7ED' : C.white,
          cursor: 'pointer', fontSize: 13, color: C.navy, fontWeight: checked ? 600 : 400
        }}>
          <input type="checkbox" checked={checked} style={{ accentColor: C.orange }}
            onChange={() => onChange(checked ? (values || []).filter(v => v !== opt) : [...(values || []), opt])} />
          {opt}
        </label>
      )
    })}
  </div>
)

const RadioCard = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
    {options.map(opt => (
      <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
        padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${value === opt.value ? C.orange : C.border}`,
        background: value === opt.value ? '#FFF7ED' : C.white, color: C.navy, cursor: 'pointer',
        fontSize: 13, fontWeight: value === opt.value ? 700 : 500
      }}>{opt.label}</button>
    ))}
  </div>
)

const Card = ({ children, style }) => (
  <div style={{ background: C.white, borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(15,23,42,0.06)', border: `1px solid ${C.border}`, ...style }}>
    {children}
  </div>
)

const InfoCard = ({ title, titleAccent, children, style }) => (
  <div style={{ background: C.white, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(15,23,42,0.05)', border: `1px solid ${C.border}`, ...style }}>
    <h3 style={{ fontSize: 15, fontWeight: 800, color: C.navy, margin: '0 0 14px' }}>{title} {titleAccent && <span style={{ color: C.orange }}>{titleAccent}</span>}</h3>
    {children}
  </div>
)

export default function AgentApplyPage() {
  const isMobile = useIsMobile()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingId, setUploadingId] = useState(false)

  const [f, setF] = useState({
    fullName: '', lastName: '', dateOfBirth: '', gender: '', maritalStatus: '',
    email: '', phone: '', addressFull: '', city: '', department: '', country: 'Ayiti',
    photoBase64: '', idDocumentType: '', idDocumentBase64: '',
    educationLevel: '', fieldOfStudy: '', schoolName: '', otherCertifications: '',
    currentProfession: '', currentlyEmployed: null, companyName: '', jobTitle: '',
    yearsExperience: '', experienceDomain: '',
    skills: { smartphone: false, laptop: false, internetHome: false, transport: false },
    languages: [],
    domains: [],
    commercialEval: { hasExperience: [], clientTypes: [], socialMedia: [], convinceApproach: '', monthlyClientsEstimate: '', workZone: '' },
    systemEval: { systemTypes: [], toolsKnown: [], hasDemoedSoftware: null, businessContacts: [], potentialClientSuggestion: '', yearlyBusinessTarget: '', businessGrowthStrategy: '' },
    whyAgent: '', goals12Months: '', threeTraits: '', weakness: '',
    references: [{ name: '', phone: '', relation: '' }, { name: '', phone: '', relation: '' }],
    payoutMethod: '', natcashNumber: '',
    declareInfoAccurate: false, agreeRules: false, agreeVerification: false,
  })

  const set = (key, val) => setF(prev => ({ ...prev, [key]: val }))
  const setNested = (key, subkey, val) => setF(prev => ({ ...prev, [key]: { ...prev[key], [subkey]: val } }))

  const progress = Math.round(((step + 1) / STEPS.length) * 100)

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try { set('photoBase64', await fileToBase64(file)) }
    catch (err) { toast.error(err.message) }
    finally { setUploadingPhoto(false) }
  }
  const handleIdDoc = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingId(true)
    try { set('idDocumentBase64', await fileToBase64(file)) }
    catch (err) { toast.error(err.message) }
    finally { setUploadingId(false) }
  }

  const validateStep = () => {
    if (step === 0) {
      if (!f.fullName || !f.phone || !f.city) { toast.error('Non, telefòn/WhatsApp, ak vil obligatwa.'); return false }
    }
    if (step === 2) {
      if (!f.domains.length) { toast.error('Chwazi omwen yon domèn.'); return false }
    }
    if (step === 5) {
      if (!f.declareInfoAccurate || !f.agreeRules || !f.agreeVerification) {
        toast.error('Ou dwe dakò ak tout deklarasyon yo pou soumèt.')
        return false
      }
      if (f.payoutMethod === 'natcash' && !f.natcashNumber) {
        toast.error('Antre nimewo NatCash ou.')
        return false
      }
    }
    return true
  }

  const next = () => { if (validateStep()) setStep(s => Math.min(STEPS.length - 1, s + 1)) }
  const prev = () => setStep(s => Math.max(0, s - 1))

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      const res = await agentApi.post('/agents/apply', f)
      setDone({ dossierNumber: res.data.dossierNumber })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erè pandan soumèt fòm lan.')
    } finally {
      setSubmitting(false)
    }
  }

  const wantsCommercial = f.domains.includes('commercial') || f.domains.includes('both')
  const wantsSystem     = f.domains.includes('system') || f.domains.includes('both')

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Card style={{ maxWidth: 480, textAlign: 'center', padding: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color={C.orange} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navy, margin: '0 0 8px' }}>Mèsi!</h1>
          <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
            Nou resevwa aplikasyon ou avèk siksè. Ekip rekritman Plus Group ap analize dosye w la
            e n ap kontakte w si w seleksyone pou pwochen etap yo.
          </p>
          <div style={{ background: C.bg, borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nimewo Dosye</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.navy, margin: 0, fontFamily: 'monospace' }}>{done.dossierNumber}</p>
          </div>
          <Link to="/agent" style={{ color: C.orange, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>← Retounen sou Login Ajan</Link>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: isMobile ? '14px 16px' : '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO_URL} alt="Plus Group" style={{ width: 46, height: 46, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.navy, letterSpacing: '-0.01em' }}>
              PLUS <span style={{ color: C.orange }}>GROUP</span>
            </h1>
            <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>Inovasyon • Konfyans • Rezilta</p>
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.navy }}>
              <ShieldCheck size={16} color={C.blue} />
              <span style={{ fontWeight: 700 }}>100% Sekirite</span>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={17} color={C.textMuted} />
            </div>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {!isMobile && (
          <aside style={{ width: 260, background: `linear-gradient(180deg, ${C.navy}, ${C.navyPanel})`, padding: '32px 20px', flexShrink: 0, color: C.white, display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Pwogrè Enskripsyon</p>
            <p style={{ fontSize: 30, fontWeight: 900, margin: '0 0 10px', color: C.white }}>{progress}%</p>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 6, overflow: 'hidden', marginBottom: 28 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const state = i < step ? 'done' : i === step ? 'active' : 'todo'
                return (
                  <div key={s.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12,
                    background: state === 'active' ? C.white : 'transparent'
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: state === 'active' ? C.orange : state === 'done' ? C.orange : 'rgba(255,255,255,0.12)',
                      color: C.white, fontWeight: 800, fontSize: 12
                    }}>
                      {state === 'done' ? <CheckCircle2 size={15} /> : (i + 1)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: state === 'active' ? C.navy : state === 'done' ? C.white : 'rgba(255,255,255,0.5)' }}>{s.label}</p>
                      <p style={{ margin: 0, fontSize: 10.5, color: state === 'active' ? C.textMuted : 'rgba(255,255,255,0.4)' }}>{s.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Headphones size={16} color={C.orangeLight} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Bezwen èd?</p>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Nou la pou ede w.</p>
              <a href="https://wa.me/50942449024" target="_blank" rel="noreferrer" style={{
                display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8, background: C.orange,
                color: C.white, fontSize: 12, fontWeight: 700, textDecoration: 'none'
              }}>Kontakte nou</a>
            </div>
          </aside>
        )}

        <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '28px 24px', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
            {isMobile && (
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <PromoCarousel maxWidth={400} height={280} />
              </div>
            )}
            {isMobile && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                  <span>Etap {step + 1} sou {STEPS.length}</span><span>{progress}%</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})` }} />
                </div>
              </div>
            )}

            <div style={{ background: C.white, borderRadius: '16px 16px 0 0', padding: '14px 24px', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: C.orange, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Etap {step + 1} sou {STEPS.length}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: C.navy }}>{STEPS[step].label}</p>
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                    <div style={{ flex: 1, height: 6, background: C.bg, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLight})` }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{progress}%</span>
                  </div>
                )}
              </div>
            </div>

            <Card style={{ borderRadius: '0 0 16px 16px', borderTop: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(() => { const Icon = STEPS[step].icon; return <Icon size={20} color={C.orange} /> })()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>{STEPS[step].label}</h2>
                  <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>Tanpri ranpli tout enfòmasyon ki anba yo ak presizyon.</p>
                </div>
              </div>

              {step === 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <Field label="Non konplè" required><IconInput icon={User} value={f.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Ekri non w konplè" /></Field>
                    <Field label="Siyati"><IconInput icon={PenLine} value={f.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Ekri siyati w" /></Field>
                    <Field label="Dat nesans"><IconInput icon={Calendar} type="date" value={f.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
                    <Field label="Sèks">
                      <Select value={f.gender} onChange={e => set('gender', e.target.value)}>
                        <option value="">Chwazi</option><option value="fanm">Fanm</option><option value="gason">Gason</option>
                      </Select>
                    </Field>
                    <Field label="Eta sivil">
                      <Select value={f.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}>
                        <option value="">Chwazi</option>
                        <option value="selibatè">Selibatè</option><option value="marye">Marye</option>
                        <option value="plasay">Plasay</option><option value="divòse">Divòse</option><option value="vèv">Vèv</option>
                      </Select>
                    </Field>
                    <Field label="Nimewo WhatsApp" required><IconInput icon={Phone} value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+509 XX XX XXXX" /></Field>
                    <Field label="Imèl (opsyonèl)"><IconInput icon={Mail} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="example@mail.com" /></Field>
                    <Field label="Vil / Komin" required><IconInput icon={MapPin} value={f.city} onChange={e => set('city', e.target.value)} placeholder="Chwazi vil / komin" /></Field>
                    <Field label="Depatman"><IconInput icon={Map} value={f.department} onChange={e => set('department', e.target.value)} placeholder="egzanp: Nò-Est" /></Field>
                    <Field label="Peyi"><IconInput icon={Globe} value={f.country} onChange={e => set('country', e.target.value)} /></Field>
                    <div style={{ gridColumn: '1/-1' }}>
                      <Field label="Adrès konplè"><IconInput icon={Home} value={f.addressFull} onChange={e => set('addressFull', e.target.value)} placeholder="Ekri adrès ou" /></Field>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}><GraduationCap size={14} /> Edikasyon</p>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                      <Field label="Dènye nivo etid">
                        <Select value={f.educationLevel} onChange={e => set('educationLevel', e.target.value)}>
                          <option value="">Chwazi</option>
                          <option value="primè">Primè</option><option value="segondè">Segondè</option>
                          <option value="teknik">Teknik / Pwofesyonèl</option><option value="inivèsite">Inivèsite</option>
                        </Select>
                      </Field>
                      <Field label="Domèn etid"><TextInput value={f.fieldOfStudy} onChange={e => set('fieldOfStudy', e.target.value)} /></Field>
                      <Field label="Non lekòl/inivèsite"><TextInput value={f.schoolName} onChange={e => set('schoolName', e.target.value)} /></Field>
                      <Field label="Lòt fòmasyon/sètifikasyon"><TextInput value={f.otherCertifications} onChange={e => set('otherCertifications', e.target.value)} /></Field>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16 }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}><Briefcase size={14} /> Sitiyasyon Pwofesyonèl</p>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                      <Field label="Pwofesyon aktyèl"><TextInput value={f.currentProfession} onChange={e => set('currentProfession', e.target.value)} /></Field>
                      <Field label="Ou travay kounye a?">
                        <RadioCard options={[{ value: true, label: 'Wi' }, { value: false, label: 'Non' }]} value={f.currentlyEmployed} onChange={v => set('currentlyEmployed', v)} />
                      </Field>
                      {f.currentlyEmployed === true && <>
                        <Field label="Non konpayi an"><TextInput value={f.companyName} onChange={e => set('companyName', e.target.value)} /></Field>
                        <Field label="Pòs ou okipe"><TextInput value={f.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></Field>
                      </>}
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>📈 Eksperyans</p>
                    <Field label="Konbyen ane eksperyans ou genyen?">
                      <RadioCard value={f.yearsExperience} onChange={v => set('yearsExperience', v)} options={[
                        { value: 'pa_genyen', label: 'Pa genyen' }, { value: 'mwens_1', label: 'Mwens pase 1 ane' },
                        { value: '1-3', label: '1–3 ane' }, { value: '3-5', label: '3–5 ane' }, { value: '5+', label: 'Plis pase 5 ane' },
                      ]} />
                    </Field>
                    <Field label="Nan ki domèn ou genyen eksperyans?"><TextInput value={f.experienceDomain} onChange={e => set('experienceDomain', e.target.value)} /></Field>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>📱 Konpetans</p>
                    <Field label="Ou posede:">
                      <CheckboxGroup options={['smartphone', 'laptop', 'internetHome', 'transport']}
                        values={Object.keys(f.skills).filter(k => f.skills[k])}
                        onChange={(vals) => set('skills', { smartphone: vals.includes('smartphone'), laptop: vals.includes('laptop'), internetHome: vals.includes('internetHome'), transport: vals.includes('transport') })} />
                    </Field>
                    <Field label="Ki lang ou pale?">
                      <CheckboxGroup options={['Kreyòl', 'Fransè', 'Anglè', 'Espanyòl', 'Lòt']} values={f.languages} onChange={v => set('languages', v)} />
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 10 }}>Foto Resan (vizaj byen vizib) *</p>
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                      height: 160, borderRadius: 14, border: `2px dashed ${f.photoBase64 ? C.orange : C.border}`,
                      background: f.photoBase64 ? '#FFF7ED' : C.bg, cursor: 'pointer', overflow: 'hidden', position: 'relative'
                    }}>
                      {uploadingPhoto ? <Loader2 size={28} className="spin" color={C.orange} /> : f.photoBase64 ? (
                        <img src={f.photoBase64} alt="preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <>
                          <Camera size={28} color={C.textMuted} />
                          <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>Klike pou ajoute Foto Resan</span>
                          <span style={{ fontSize: 11, color: C.textMuted }}>PNG, JPG — max 2MB</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                    </label>
                    {f.photoBase64 && (
                      <button type="button" onClick={() => set('photoBase64', '')} style={{ marginTop: 8, background: 'none', border: 'none', color: C.danger, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={13} /> Retire foto
                      </button>
                    )}
                  </div>

                  <div>
                    <Field label="Kalite Pyès Idantite" required>
                      <RadioCard value={f.idDocumentType} onChange={v => set('idDocumentType', v)} options={[
                        { value: 'kat_nasyonal', label: '🪪 Kat Nasyonal' }, { value: 'paspò', label: '📘 Paspò' }, { value: 'permi', label: '🚗 Permi' }
                      ]} />
                    </Field>
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                      height: 140, borderRadius: 14, border: `2px dashed ${f.idDocumentBase64 ? C.orange : C.border}`,
                      background: f.idDocumentBase64 ? '#FFF7ED' : C.bg, cursor: 'pointer', overflow: 'hidden'
                    }}>
                      {uploadingId ? <Loader2 size={28} className="spin" color={C.orange} /> : f.idDocumentBase64 ? (
                        <img src={f.idDocumentBase64} alt="preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <>
                          <CreditCard size={28} color={C.textMuted} />
                          <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>Klike pou ajoute Pyès Idantite</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleIdDoc} style={{ display: 'none' }} />
                    </label>
                  </div>

                  <div style={{ background: '#EFF6FF', border: `1px solid #BFDBFE`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10 }}>
                    <ShieldCheck size={16} color={C.blue} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>Tout enfòmasyon ou bay yo ap rete konfidansyèl epi yo pral itilize sèlman pou pwosesis rekritman an.</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Nan ki domèn ou ta renmen reprezante PLUS GROUP? (Ou kapab chwazi plis pase yon opsyon.)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    {[
                      { value: 'commercial', icon: '🛒', title: 'AJAN KOMÈSYAL', desc: 'Vann pwodwi ak sèvis PLUS GROUP.' },
                      { value: 'system',     icon: '💻', title: 'AJAN SISTÈM',   desc: 'Vann sistèm jesyon pou biznis ak enstitisyon.' },
                      { value: 'both',       icon: '⭐', title: 'TOUDE DOMÈN',  desc: 'Mwen kapab travay nan toude domèn yo.' },
                      { value: 'open',       icon: '🚀', title: 'NENPÒT OPSYON', desc: 'Mwen ouvè pou nenpòt lòt opòtinite Plus Group genyen.' },
                    ].map(opt => {
                      const checked = f.domains.includes(opt.value)
                      return (
                        <div key={opt.value} onClick={() => set('domains', checked ? f.domains.filter(d => d !== opt.value) : [...f.domains, opt.value])}
                          style={{
                            padding: 18, borderRadius: 14, cursor: 'pointer',
                            border: `2px solid ${checked ? C.orange : C.border}`, background: checked ? '#FFF7ED' : C.white, position: 'relative'
                          }}>
                          {checked && <CheckCircle2 size={18} color={C.orange} style={{ position: 'absolute', top: 12, right: 12 }} />}
                          <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.icon}</div>
                          <p style={{ fontWeight: 800, fontSize: 13, color: C.navy, margin: '0 0 4px' }}>{opt.title}</p>
                          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{opt.desc}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', border: `1.5px solid ${C.orangeLight}`, borderRadius: 14, padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 28, flexShrink: 0 }}>🏆</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: C.orangeDark, margin: '0 0 4px' }}>Konkou Ajan Ane a</p>
                      <p style={{ fontSize: 12, color: C.navy, margin: 0, lineHeight: 1.5 }}>
                        Chak ane, Plus Group distribye <strong>100,000 HTG</strong> bay 3 pi gwo ajan yo. Pou fè pati 3 ganyan yo,
                        objektif la se konekte <strong>plis pase 20 antrepriz</strong> sou kòd promo w la. Plis ou mennen antrepriz,
                        plis chans ou genyen pou ranpòte gwo lo a nan fèt fen ane a!
                      </p>
                    </div>
                  </div>

                  {wantsCommercial && (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: C.orangeDark, margin: '0 0 12px' }}>🛒 Evalyasyon — Ajan Komèsyal</p>
                      <Field label="Èske ou deja:">
                        <CheckboxGroup options={['Vann pwodwi', 'Vann sèvis', 'Travay kòm ajan', 'Travay nan sèvis kliyan', 'Pa gen eksperyans']}
                          values={f.commercialEval.hasExperience} onChange={v => setNested('commercialEval', 'hasExperience', v)} />
                      </Field>
                      <Field label="Ki kalite kliyan ou konn sèvi?">
                        <CheckboxGroup options={['Moun endividyèl', 'Boutik', 'Antrepriz', 'Lekòl', 'Klinik', 'Restoran', 'Lòt']}
                          values={f.commercialEval.clientTypes} onChange={v => setNested('commercialEval', 'clientTypes', v)} />
                      </Field>
                      <Field label="Ki rezo sosyal ou itilize pou vann?">
                        <CheckboxGroup options={['Facebook', 'WhatsApp', 'TikTok', 'Instagram', 'Lòt']}
                          values={f.commercialEval.socialMedia} onChange={v => setNested('commercialEval', 'socialMedia', v)} />
                      </Field>
                      <Field label="Kijan ou fè konvenk yon kliyan achte?">
                        <TextArea value={f.commercialEval.convinceApproach} onChange={e => setNested('commercialEval', 'convinceApproach', e.target.value)} />
                      </Field>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                        <Field label="Konbyen kliyan ou kwè ou ka jwenn chak mwa?"><TextInput type="number" value={f.commercialEval.monthlyClientsEstimate} onChange={e => setNested('commercialEval', 'monthlyClientsEstimate', e.target.value)} /></Field>
                        <Field label="Nan ki zòn ou ka travay?"><TextInput value={f.commercialEval.workZone} onChange={e => setNested('commercialEval', 'workZone', e.target.value)} /></Field>
                      </div>
                    </div>
                  )}

                  {wantsSystem && (
                    <div style={{ borderTop: wantsCommercial ? `1px solid ${C.border}` : 'none', paddingTop: wantsCommercial ? 20 : 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: C.blue, margin: '0 0 12px' }}>💻 Evalyasyon — Ajan Sistèm pou Antrepriz</p>
                      <Field label="Ki kalite sistèm ou ta renmen vann?">
                        <CheckboxGroup options={['POS', 'Stock', 'Lekòl', 'Klinik', 'Famasi', 'Restoran', 'Otèl', 'Mikwofinans', 'HR', 'Kontablite', 'Lòt']}
                          values={f.systemEval.systemTypes} onChange={v => setNested('systemEval', 'systemTypes', v)} />
                      </Field>
                      <Field label="Ou konn itilize:">
                        <CheckboxGroup options={['Microsoft Word', 'Excel', 'Google Docs', 'Google Sheets', 'POS', 'Lojisyèl Stock', 'ERP']}
                          values={f.systemEval.toolsKnown} onChange={v => setNested('systemEval', 'toolsKnown', v)} />
                      </Field>
                      <Field label="Ou deja fè demonstrasyon yon lojisyèl devan kliyan?">
                        <RadioCard value={f.systemEval.hasDemoedSoftware} onChange={v => setNested('systemEval', 'hasDemoedSoftware', v)} options={[{ value: true, label: 'Wi' }, { value: false, label: 'Non' }]} />
                      </Field>
                      <Field label="Ki kalite antrepriz ou deja gen kontak avèk yo?">
                        <CheckboxGroup options={['Boutik', 'Makèt', 'Lekòl', 'Klinik', 'Restoran', 'Otèl', 'ONG', 'Lòt']}
                          values={f.systemEval.businessContacts} onChange={v => setNested('systemEval', 'businessContacts', v)} />
                      </Field>
                      <Field label="Èske w gen yon antrepriz espesifik nan tèt ou deja ou ta ka pote?" hint="Opsyonèl — si w gen yon kliyan an tèt, ekri non biznis la ak yon ti detay.">
                        <TextArea value={f.systemEval.potentialClientSuggestion} onChange={e => setNested('systemEval', 'potentialClientSuggestion', e.target.value)} placeholder="egzanp: Yon boutik/famasi/lekòl mwen konnen ki ta bezwen sistèm konsa..." />
                      </Field>
                      <Field label="Konbyen antrepriz ou kwè ou ka konekte sou kòd promo w la nan 12 pwochen mwa yo?" hint="Objektif konkou a se 20+ antrepriz pou yon ane.">
                        <TextInput type="number" min="0" value={f.systemEval.yearlyBusinessTarget} onChange={e => setNested('systemEval', 'yearlyBusinessTarget', e.target.value)} placeholder="egzanp: 25" />
                      </Field>
                      <Field label="Ki estrateji ou pral itilize pou jwenn plizyè antrepriz (pa sèlman youn)?">
                        <TextArea value={f.systemEval.businessGrowthStrategy} onChange={e => setNested('systemEval', 'businessGrowthStrategy', e.target.value)} />
                      </Field>
                    </div>
                  )}

                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>🎯 Motivasyon</p>
                    <Field label="Poukisa ou vle vin yon ajan Plus Group?"><TextArea value={f.whyAgent} onChange={e => set('whyAgent', e.target.value)} /></Field>
                    <Field label="Ki objektif ou ta renmen reyalize nan 12 pwochen mwa yo?"><TextArea value={f.goals12Months} onChange={e => set('goals12Months', e.target.value)} /></Field>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                      <Field label="Ki 3 kalite ki pi dekri ou?"><TextInput value={f.threeTraits} onChange={e => set('threeTraits', e.target.value)} /></Field>
                      <Field label="Ki pi gwo feblès ou?"><TextInput value={f.weakness} onChange={e => set('weakness', e.target.value)} /></Field>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ background: C.bg, borderRadius: 12, padding: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', margin: '0 0 12px' }}>{i === 0 ? 'Premye' : 'Dezyèm'} Referans</p>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
                        <TextInput placeholder="Non" value={f.references[i].name} onChange={e => { const r = [...f.references]; r[i] = { ...r[i], name: e.target.value }; set('references', r) }} />
                        <TextInput placeholder="Telefòn" value={f.references[i].phone} onChange={e => { const r = [...f.references]; r[i] = { ...r[i], phone: e.target.value }; set('references', r) }} />
                        <TextInput placeholder="Relasyon" value={f.references[i].relation} onChange={e => { const r = [...f.references]; r[i] = { ...r[i], relation: e.target.value }; set('references', r) }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>💵 Kijan ou vle resevwa peman komisyon ou?</p>
                    <RadioCard value={f.payoutMethod} onChange={v => set('payoutMethod', v)} options={[
                      { value: 'natcash', label: '📱 NatCash' }, { value: 'office', label: '🏢 Fizikman nan Biwo' }
                    ]} />
                    {f.payoutMethod === 'natcash' && (
                      <div style={{ marginTop: 12 }}>
                        <Field label="Nimewo NatCash ou" required><TextInput value={f.natcashNumber} onChange={e => set('natcashNumber', e.target.value)} placeholder="+509 XX XX XXXX" /></Field>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.navy, margin: 0 }}>✅ Deklarasyon</p>
                    {[
                      ['declareInfoAccurate', 'Mwen deklare tout enfòmasyon mwen bay yo egzak.'],
                      ['agreeRules', 'Mwen dakò respekte règ ak prensip Plus Group.'],
                      ['agreeVerification', 'Mwen dakò Plus Group verifye enfòmasyon mwen yo si sa nesesè.'],
                    ].map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={f[key]} onChange={e => set(key, e.target.checked)} style={{ marginTop: 2, accentColor: C.orange, width: 16, height: 16 }} />
                        <span style={{ fontSize: 13, color: C.navy, lineHeight: 1.5 }}>{label}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px' }}>
                    <p style={{ fontSize: 12, color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                      Apre ekip rekritman an fin analize dosye ou, y ap kontakte sèlman kandida ki satisfè kondisyon yo
                      pou etap entèvyou ak fòmasyon.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <button type="button" onClick={prev} disabled={step === 0} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.white, color: step === 0 ? C.border : C.navy,
                  cursor: step === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700
                }}>
                  <ArrowLeft size={14} /> Retounen
                </button>

                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={next} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 10, border: 'none',
                    background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: C.white, cursor: 'pointer', fontSize: 13, fontWeight: 700
                  }}>
                    Kontinye <ArrowRight size={14} />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={submitting} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 10, border: 'none',
                    background: submitting ? '#94A3B8' : `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: C.white, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700
                  }}>
                    {submitting ? <><Loader2 size={14} className="spin" /> Ap soumèt...</> : <>Soumèt Aplikasyon <CheckCircle2 size={14} /></>}
                  </button>
                )}
              </div>
            </Card>

            <Link to="/agent" style={{ display: 'block', textAlign: 'center', marginTop: 16, color: C.textMuted, fontSize: 12, textDecoration: 'none' }}>
              Deja yon ajan? Konekte
            </Link>
          </div>

          {!isMobile && (
            <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PromoCarousel maxWidth={260} height={340} />
              <InfoCard title="Poukisa vin ajan" titleAccent="PLUS GROUP?">
                {[
                  { icon: DollarSign, text: 'Opòtinite revni atraktif' },
                  { icon: GraduationCap, text: 'Fòmasyon ak sipò kontinyèl' },
                  { icon: Monitor, text: 'Zouti ak teknoloji modèn' },
                  { icon: Star, text: 'Kariyè ak avansman pwofesyonèl' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 3 ? 14 : 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={14} color={C.orange} />
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: C.navy, fontWeight: 600, lineHeight: 1.4 }}>{item.text}</p>
                  </div>
                ))}
              </InfoCard>

              <InfoCard title="Sekirite" titleAccent="Done">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={24} color={C.blue} />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                  Nou pran sekirite done w yo trè seryezman. Enfòmasyon ou yo pwoteje ak teknoloji SSL 256-bit.
                </p>
              </InfoCard>
            </div>
          )}
        </main>
      </div>

      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.white, padding: isMobile ? '16px' : '16px 32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 11.5, color: C.textMuted }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: C.navy }}>© 2026 PLUS GROUP</p>
          <p style={{ margin: 0 }}>Tout dwa rezève.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Globe size={13} color={C.blue} /> 100% Sou entènèt</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle2 size={13} color={C.blue} /> Pwosesis rapid</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ShieldCheck size={13} color={C.blue} /> Sekirite garanti</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Lock size={13} color={C.blue} /> Konfidansyalite total</span>
        </div>
      </footer>

      <style>{`.spin { animation: spin 0.8s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}