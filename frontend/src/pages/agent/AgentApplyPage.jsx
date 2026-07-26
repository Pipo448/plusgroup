// src/pages/agent/AgentApplyPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  User, FileText, Briefcase, ClipboardList, Users, CheckCircle2,
  Camera, CreditCard, ArrowLeft, ArrowRight, ShieldCheck, Lock, Loader2, X
} from 'lucide-react'
import { agentApi } from '../../services/agentApi'

const C = {
  navy: '#0F172A', navyLight: '#1E293B', emerald: '#10B981', emeraldDark: '#059669',
  white: '#FFFFFF', bg: '#F8FAFC', blue: '#3B82F6', danger: '#EF4444',
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
  const [m, setM] = useState(window.innerWidth < 900)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 900)
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
const Select = ({ children, ...props }) => <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{children}</select>

const CheckboxGroup = ({ options, values, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
    {options.map(opt => {
      const checked = (values || []).includes(opt)
      return (
        <label key={opt} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
          border: `1.5px solid ${checked ? C.emerald : C.border}`, background: checked ? '#ECFDF5' : C.white,
          cursor: 'pointer', fontSize: 13, color: C.navy, fontWeight: checked ? 600 : 400
        }}>
          <input type="checkbox" checked={checked} style={{ accentColor: C.emerald }}
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
        padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${value === opt.value ? C.emerald : C.border}`,
        background: value === opt.value ? '#ECFDF5' : C.white, color: C.navy, cursor: 'pointer',
        fontSize: 13, fontWeight: value === opt.value ? 700 : 500
      }}>{opt.label}</button>
    ))}
  </div>
)

const Card = ({ children, style }) => (
  <div style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', border: `1px solid ${C.border}`, ...style }}>
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
    systemEval: { systemTypes: [], toolsKnown: [], hasDemoedSoftware: null, businessContacts: [], whyNeedSystem: '', plusGroupAdvantage: '' },
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
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color={C.emerald} />
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
          <Link to="/agent" style={{ color: C.emerald, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>← Retounen sou Login Ajan</Link>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: isMobile ? '14px 16px' : '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: C.white, fontWeight: 900, fontSize: 16 }}>PG</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.navy }}>Portal Rekritman Ajan</h1>
            <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>Antre nan ekip ajan ofisyèl PLUS GROUP</p>
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.textMuted }}>
            <Lock size={13} color={C.emerald} /> 100% Konfidansyèl
          </div>
        )}
      </header>

      <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto' }}>
        {!isMobile && (
          <aside style={{ width: 220, padding: '32px 16px', flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 4px' }}>Pwogrè Enskripsyon</p>
            <div style={{ height: 6, background: C.border, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${C.emerald}, ${C.blue})`, transition: 'width 0.3s' }} />
            </div>
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const state = i < step ? 'done' : i === step ? 'active' : 'todo'
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 10, background: state === 'active' ? '#ECFDF5' : 'transparent', marginBottom: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: state === 'done' ? C.emerald : state === 'active' ? C.navy : C.border,
                    color: state === 'todo' ? C.textMuted : C.white
                  }}>
                    {state === 'done' ? <CheckCircle2 size={15} /> : <Icon size={13} />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: state === 'active' ? 700 : 500, color: state === 'todo' ? C.textMuted : C.navy }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: 10, color: C.textMuted }}>{s.sub}</p>
                  </div>
                </div>
              )
            })}
          </aside>
        )}

        <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '32px 24px', maxWidth: 720 }}>
          {isMobile && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                <span>Etap {step + 1} sou {STEPS.length}</span><span>{progress}%</span>
              </div>
              <div style={{ height: 6, background: C.border, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${C.emerald}, ${C.blue})` }} />
              </div>
            </div>
          )}

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => { const Icon = STEPS[step].icon; return <Icon size={18} color={C.emerald} /> })()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>{STEPS[step].label}</h2>
                <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>{STEPS[step].sub}</p>
              </div>
            </div>

            {step === 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <Field label="Non" required><TextInput value={f.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Ekri non w konplè" /></Field>
                  <Field label="Siyati"><TextInput value={f.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Ekri siyati w" /></Field>
                  <Field label="Dat nesans"><TextInput type="date" value={f.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
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
                  <Field label="Nimewo WhatsApp" required><TextInput value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+509 XX XX XXXX" /></Field>
                  <Field label="Imèl (opsyonèl)"><TextInput type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="example@mail.com" /></Field>
                  <Field label="Vil / Komin" required><TextInput value={f.city} onChange={e => set('city', e.target.value)} placeholder="Chwazi vil / komin" /></Field>
                  <Field label="Depatman"><TextInput value={f.department} onChange={e => set('department', e.target.value)} placeholder="egzanp: Nò-Est" /></Field>
                  <Field label="Peyi"><TextInput value={f.country} onChange={e => set('country', e.target.value)} /></Field>
                  <div style={{ gridColumn: '1/-1' }}>
                    <Field label="Adrès konplè"><TextInput value={f.addressFull} onChange={e => set('addressFull', e.target.value)} placeholder="Ekri adrès ou" /></Field>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>🎓 Edikasyon</p>
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
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>💼 Sitiyasyon Pwofesyonèl</p>
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
                    height: 160, borderRadius: 14, border: `2px dashed ${f.photoBase64 ? C.emerald : C.border}`,
                    background: f.photoBase64 ? '#ECFDF5' : C.bg, cursor: 'pointer', overflow: 'hidden', position: 'relative'
                  }}>
                    {uploadingPhoto ? <Loader2 size={28} className="spin" color={C.emerald} /> : f.photoBase64 ? (
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
                    height: 140, borderRadius: 14, border: `2px dashed ${f.idDocumentBase64 ? C.emerald : C.border}`,
                    background: f.idDocumentBase64 ? '#ECFDF5' : C.bg, cursor: 'pointer', overflow: 'hidden'
                  }}>
                    {uploadingId ? <Loader2 size={28} className="spin" color={C.emerald} /> : f.idDocumentBase64 ? (
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
                          border: `2px solid ${checked ? C.emerald : C.border}`, background: checked ? '#ECFDF5' : C.white, position: 'relative'
                        }}>
                        {checked && <CheckCircle2 size={18} color={C.emerald} style={{ position: 'absolute', top: 12, right: 12 }} />}
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
                {wantsCommercial && (
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.emeraldDark, margin: '0 0 12px' }}>🛒 Evalyasyon — Ajan Komèsyal</p>
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
                    <Field label="Poukisa ou panse yon antrepriz bezwen yon sistèm jesyon?">
                      <TextArea value={f.systemEval.whyNeedSystem} onChange={e => setNested('systemEval', 'whyNeedSystem', e.target.value)} />
                    </Field>
                    <Field label="Ki avantaj Plus Group ta ka ofri yon antrepriz?">
                      <TextArea value={f.systemEval.plusGroupAdvantage} onChange={e => setNested('systemEval', 'plusGroupAdvantage', e.target.value)} />
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
                      <input type="checkbox" checked={f[key]} onChange={e => set(key, e.target.checked)} style={{ marginTop: 2, accentColor: C.emerald, width: 16, height: 16 }} />
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
                  background: C.emerald, color: C.white, cursor: 'pointer', fontSize: 13, fontWeight: 700
                }}>
                  Kontinye <ArrowRight size={14} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={submitting} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 10, border: 'none',
                  background: submitting ? '#94A3B8' : C.emerald, color: C.white, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700
                }}>
                  {submitting ? <><Loader2 size={14} className="spin" /> Ap soumèt...</> : <>Soumèt Aplikasyon <CheckCircle2 size={14} /></>}
                </button>
              )}
            </div>
          </Card>

          <Link to="/agent" style={{ display: 'block', textAlign: 'center', marginTop: 16, color: C.textMuted, fontSize: 12, textDecoration: 'none' }}>
            Deja yon ajan? Konekte
          </Link>
        </main>
      </div>

      <style>{`.spin { animation: spin 0.8s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}