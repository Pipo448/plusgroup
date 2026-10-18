// src/pages/settings/SettingsPage.jsx — Plus Fit redesign
// ✅ KORIJE:
//   • « Chanje modpas itilizatè » te montre « undefined » nan lis la (u.name → u.fullName)
//   • Modpas: 6 karaktè isit men 8 lè w kreye kont lan → kounye a 8 toupatou + chan konfimasyon
//   • PIN Devi Dirèk: pa t gen konfimasyon (yon fot frap te ka bloke kesye yo)
//   • taxRate te voye kòm tèks ("10") → kounye a se yon nonb, ant 0 ak 100
//   • updateTenant te melanje ak ansyen paramèt yo (yon chanjman te ka efase yon lòt)
//   • to chanj yo te voye kòm tèks/vid pou lòt lajan yo
//   • logo: pa t gen limit gwosè ni endikatè chajman; fichye ki pa imaj te aksepte
//   • koulè prensipal: nenpòt tèks te aksepte (kounye a se #RRGGBB sèlman)
//   • onglè yo ak griy yo te debòde sou telefòn
//   • switch vizibilite lajan an pa t retounen si sèvè a refize
// ✅ NOUVO:
//   • Apèsi resi a an dirèk (logo, to, QR, nòt) pandan w ap modifye
//   • Ba « chanjman pa sove » + avètisman si w kite paj la san sove
//   • Paj la sonje dènye onglè w te louvri
//   • Koulè rapid, kalkilatè konvèsyon lajan, lyen « Tès enprimant »
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Settings, Users, DollarSign, Upload, Save, RefreshCw, ArrowUpDown, Building2, Palette, Printer,
  Bluetooth, Usb, Wifi, Eye, EyeOff, QrCode, Shield, FileText, Lock, Image, Globe, Receipt,
  Workflow, ChevronRight, Check, Zap, Undo2, Calculator,
} from 'lucide-react'
import api, { tenantAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import '../invoices/invoices.css'

const tr = (t, k, fb) => { const v = t(k); return v && v !== k ? v : fb }
const fmt = (n, d = 2) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ /g, ' ').replace(/ /g, ' ')
const TAB_KEY = 'pg-settings-tab'
const HEX = /^#[0-9A-Fa-f]{6}$/
const MAX_LOGO = 5 * 1024 * 1024

const CURRENCIES = [
  { value: 'USD', name: 'Dola Ameriken',  flag: '🇺🇸', symbol: '$',   eg: '132.00' },
  { value: 'DOP', name: 'Peso Dominiken', flag: '🇩🇴', symbol: 'RD$', eg: '2.28' },
  { value: 'EUR', name: 'Euro',           flag: '🇪🇺', symbol: '€',   eg: '143.00' },
  { value: 'CAD', name: 'Dola Kanadyen',  flag: '🇨🇦', symbol: 'CA$', eg: '96.00' },
]
const SWATCHES = ['#1B2A8F', '#0F766E', '#7C3AED', '#C0392B', '#D97706', '#059669', '#0284C7', '#0F172A']

// ════════════════════════════════════════════════════════════
// Ti eleman
// ════════════════════════════════════════════════════════════
function ToggleRow({ on, onChange, icon: Icon, offIcon: OffIcon, title, desc, color = '#1B2A8F', disabled, children }) {
  const I = !on && OffIcon ? OffIcon : Icon
  return (
    <div>
      <div className={`set-row ${on ? 'on' : ''}`} style={{ '--rc': color, opacity: disabled ? .6 : 1 }} role="switch" aria-checked={!!on} tabIndex={0}
        onClick={() => !disabled && onChange(!on)} onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), !disabled && onChange(!on))}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span className="ic"><I size={17}/></span>
          <div style={{ minWidth: 0 }}><b>{title}</b>{desc && <small>{desc}</small>}</div>
        </div>
        <span className={`set-sw ${on ? 'on' : ''}`}/>
      </div>
      {children}
    </div>
  )
}

function SecHead({ icon: Icon, eb, title, color, right }) {
  return (
    <div className="iv-sec-h">
      <div className="n" style={color ? { background: color } : undefined}><Icon size={17}/></div>
      <div><p className="eb">{eb}</p><h3>{title}</h3></div>
      {right && <div className="r">{right}</div>}
    </div>
  )
}

function Spinner({ size = 14, color = '#fff' }) {
  return <span className="spin" style={{ width: size, height: size, border: `2px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}/>
}

// 4 bwat PIN (menm estil ak Devi Dirèk)
function PinBoxes({ value, onChange, show, autoFocus }) {
  const [focus, setFocus] = useState(false)
  return (
    <div className="iv-pin" style={{ justifyContent: 'flex-start' }}>
      {[0, 1, 2, 3].map(i => (
        <span key={i} className={`${value[i] ? 'on' : ''} ${focus && i === Math.min(value.length, 3) ? 'cur' : ''}`}>
          {value[i] ? (show ? value[i] : '•') : ''}
        </span>
      ))}
      <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} value={value} autoFocus={autoFocus}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-label="PIN"/>
    </div>
  )
}

// Apèsi resi tèmik la
function ReceiptPreview({ v, logoUrl, rates, visible }) {
  const name = v.name || 'Non antrepriz ou'
  const sub = 3500, tax = sub * (Number(v.taxRate) || 0) / 100, total = sub + tax
  const narrow = v.receiptSize === '57mm'
  const shownRates = CURRENCIES.filter(c => visible[c.value] && Number(rates[c.value]) > 0)
  return (
    <div className="set-paper" style={{ maxWidth: narrow ? 220 : 280, margin: '0 auto', fontSize: narrow ? 10 : 11 }}>
      {v.printLogoOnReceipt && (
        <div className="c" style={{ marginBottom: 6 }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{ maxWidth: 70, maxHeight: 50, objectFit: 'contain', filter: 'grayscale(1) contrast(1.4)' }} onError={e => { e.currentTarget.style.display = 'none' }}/>
            : <div style={{ width: 40, height: 40, margin: '0 auto', borderRadius: 8, background: '#111', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{name[0]}</div>}
        </div>
      )}
      <div className="c" style={{ fontWeight: 900, fontSize: narrow ? 12 : 14, textTransform: 'uppercase' }}>{name}</div>
      {v.address && <div className="c">{v.address}</div>}
      {v.phone && <div className="c">Tel: {v.phone}</div>}
      <hr/>
      <div className="r"><span>FAC-2026-0001</span><span>18/10/2026</span></div>
      <hr/>
      <div>Diri Tchako 25lb</div>
      <div className="r"><span style={{ whiteSpace: 'pre' }}>  1 x 2 250,00</span><span>2 250,00</span></div>
      <div>Lwil Mazola 1L</div>
      <div className="r"><span style={{ whiteSpace: 'pre' }}>  2 x 625,00</span><span>1 250,00</span></div>
      <hr/>
      {Number(v.taxRate) > 0 && <div className="r"><span>Taks {Number(v.taxRate)}%</span><span>{fmt(tax)}</span></div>}
      <div className="r" style={{ fontWeight: 900, fontSize: narrow ? 12 : 13 }}><span>TOTAL</span><span>{fmt(total)} HTG</span></div>
      {v.showExchangeRate && shownRates.length > 0 && (
        <>
          <hr/>
          {shownRates.map(c => <div key={c.value} className="r"><span>≈ {c.value} (1={fmt(rates[c.value])})</span><span>{fmt(total / Number(rates[c.value]))}</span></div>)}
        </>
      )}
      {v.showQrCode && <div className="qr"/>}
      {v.receiptFooterNote?.trim() && <><hr/><div className="c" style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v.receiptFooterNote}</div></>}
      <div className="c" style={{ marginTop: 6, fontWeight: 700 }}>Mèsi!</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Chanje modpas yon itilizatè (admin)
// ════════════════════════════════════════════════════════════
function ChangeUserPassword({ t }) {
  const [show, setShow] = useState(false)
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ defaultValues: { userId: '', newPassword: '', confirm: '' } })
  const pwd = watch('newPassword') || ''

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => tenantAPI.getUsers().then(r => r.data?.users || r.data || []),
    staleTime: 5 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: ({ userId, newPassword }) => tenantAPI.resetUserPassword({ userId, newPassword }),
    onSuccess: () => { toast.success(tr(t, 'settings.userPasswordChanged', 'Modpas la chanje')); reset() },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')),
  })

  const score = !pwd ? 0 : pwd.length < 8 ? 1 : pwd.length < 10 ? 2 : pwd.length < 14 ? 3 : 4
  const C = ['#E2E8F0', '#DC2626', '#D97706', '#2563EB', '#059669']
  const L = ['', tr(t, 'settings.pwd.weak', 'Fèb'), tr(t, 'settings.pwd.medium', 'Mwayen'), tr(t, 'settings.pwd.good', 'Bon'), tr(t, 'settings.pwd.strong', 'Fò')]

  return (
    <section className="iv-sec a-up" style={{ animationDelay: '80ms' }}>
      <SecHead icon={Shield} eb="Sekirite" title={tr(t, 'settings.changeUserPassword', 'Chanje modpas yon itilizatè')} color="linear-gradient(135deg,#E0B84C,#A87B12)"/>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} style={{ display: 'grid', gap: 14 }}>
        <div>
          <label className="iv-lbl">{tr(t, 'settings.selectUser', 'Itilizatè')} *</label>
          <select className="iv-inp" disabled={isLoading} style={errors.userId ? { borderColor: 'var(--bad)' } : undefined} {...register('userId', { required: true })}>
            <option value="">{isLoading ? 'Chajman…' : tr(t, 'settings.chooseUser', '— Chwazi yon itilizatè —')}</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.fullName || u.name || u.email} — {u.email}{u.role === 'admin' ? ' (Admin)' : ''}{u.isActive === false ? ' · inaktif' : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label className="iv-lbl">{tr(t, 'settings.newPassword', 'Nouvo modpas')} *</label>
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} className="iv-inp" autoComplete="new-password" style={{ paddingRight: 44, ...(errors.newPassword ? { borderColor: 'var(--bad)' } : {}) }}
                {...register('newPassword', { required: true, minLength: 8 })}/>
              <button type="button" className="iv-mini" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent' }} onClick={() => setShow(s => !s)} aria-label="Montre">
                {show ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {pwd && <>
              <div className="pw-meter">{[1, 2, 3, 4].map(i => <i key={i} style={{ background: score >= i ? C[score] : undefined }}/>)}</div>
              <small style={{ fontSize: 11, fontWeight: 800, color: C[score] }}>{L[score]}{pwd.length < 8 && ` · ${8 - pwd.length} karaktè ankò`}</small>
            </>}
          </div>
          <div>
            <label className="iv-lbl">Konfime modpas *</label>
            <input type={show ? 'text' : 'password'} className="iv-inp" autoComplete="new-password" style={errors.confirm ? { borderColor: 'var(--bad)' } : undefined}
              {...register('confirm', { required: true, validate: v => v === watch('newPassword') })}/>
            {errors.confirm && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>2 modpas yo pa menm</small>}
          </div>
        </div>
        <p className="iv-note" style={{ margin: 0, background: 'rgba(201,168,76,.10)', color: '#8B6914' }}>
          ⚠ {tr(t, 'settings.userPasswordWarning', 'Moun nan ap oblije itilize nouvo modpas sa a pwochen fwa li konekte. Ba li l nan yon fason ki an sekirite.')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="iv-btn-main" disabled={mutation.isPending} style={{ background: 'linear-gradient(135deg,#C9A84C,#8B6914)', boxShadow: '0 10px 22px rgba(201,168,76,.35)' }}>
            {mutation.isPending ? <Spinner/> : <Shield size={15}/>} {tr(t, 'settings.changePassword', 'Chanje modpas')}
          </button>
        </div>
      </form>
    </section>
  )
}

// ════════════════════════════════════════════════════════════
// PIN otorizasyon Devi Dirèk (admin)
// ════════════════════════════════════════════════════════════
function DirectQuotePinSettings({ t }) {
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [show, setShow] = useState(false)
  const mismatch = pin2.length === 4 && pin !== pin2
  const weak = pin.length === 4 && (/^(\d)\1{3}$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin))

  const mutation = useMutation({
    mutationFn: (p) => api.patch('/direct-quotes/my-pin', { pin: p }),
    onSuccess: () => { toast.success('PIN otorizasyon konfigire'); setPin(''); setPin2('') },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')),
  })
  const ok = pin.length === 4 && pin === pin2

  return (
    <section className="iv-sec a-up" style={{ animationDelay: '140ms' }}>
      <SecHead icon={Lock} eb="Devi dirèk" title="PIN otorizasyon" color="linear-gradient(135deg,#8B5CF6,#6D28D9)"
        right={<button type="button" className="iv-mini" onClick={() => setShow(s => !s)} aria-label="Montre PIN">{show ? <EyeOff size={14}/> : <Eye size={14}/>}</button>}/>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '-6px 0 14px', lineHeight: 1.5 }}>
        Kesye yo ap bezwen PIN 4 chif sa a pou kreye yon Devi Dirèk (pwodui/sèvis ki pa nan estòk). Chak admin gen pwòp PIN pa l.
      </p>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
        <div><label className="iv-lbl">Nouvo PIN</label><PinBoxes value={pin} onChange={setPin} show={show}/></div>
        <div style={{ opacity: pin.length === 4 ? 1 : .45, pointerEvents: pin.length === 4 ? 'auto' : 'none' }}>
          <label className="iv-lbl">Konfime PIN</label><PinBoxes value={pin2} onChange={setPin2} show={show}/>
        </div>
      </div>
      {mismatch && <p style={{ color: 'var(--bad)', fontSize: 12, fontWeight: 700, margin: '10px 0 0' }}>2 PIN yo pa menm.</p>}
      {weak && !mismatch && <p style={{ color: 'var(--warn)', fontSize: 12, fontWeight: 700, margin: '10px 0 0' }}>⚠ PIN sa a fasil pou devine — chwazi yon lòt si w kapab.</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button type="button" className="iv-btn-main" disabled={!ok || mutation.isPending} onClick={() => mutation.mutate(pin)}
          style={ok ? { background: 'linear-gradient(135deg,#7C3AED,#9333EA)', boxShadow: '0 10px 22px rgba(124,58,237,.35)' } : undefined}>
          {mutation.isPending ? <Spinner/> : <Lock size={15}/>} Konfigire PIN
        </button>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { updateTenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const [activeTab, setActiveTab] = useState(() => { try { return localStorage.getItem(TAB_KEY) || 'general' } catch { return 'general' } })
  const [printerConn, setPrinterConn] = useState('usb')
  const [rates, setRates] = useState({ USD: '', DOP: '', EUR: '', CAD: '' })
  const [showRates, setShowRates] = useState({ USD: true, DOP: false, EUR: false, CAD: false })
  const [logoBusy, setLogoBusy] = useState(false)
  const [calc, setCalc] = useState({ amount: '100', cur: 'USD', dir: 'toHtg' })
  const fileRef = useRef(null)

  useEffect(() => { try { localStorage.setItem(TAB_KEY, activeTab) } catch {} }, [activeTab])

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantAPI.getSettings().then(r => r.data.tenant),
  })

  // ✅ Toujou melanje ak DÈNYE vèsyon an (pa ak yon kopi ki ka vye)
  const syncTenant = useCallback((patch) => {
    const merged = { ...(qc.getQueryData(['tenant-settings']) || {}), ...patch }
    qc.setQueryData(['tenant-settings'], merged)
    updateTenant?.(merged)
    return merged
  }, [qc, updateTenant])

  const toForm = (s) => ({
    name: s.name || '', email: s.email || '', phone: s.phone || '', address: s.address || '',
    primaryColor: HEX.test(s.primaryColor || '') ? s.primaryColor : '#1B2A8F',
    taxRate: Number(s.taxRate) || 0,
    defaultLanguage: s.defaultLanguage || 'ht',
    defaultCurrency: s.defaultCurrency || 'HTG',
    receiptSize: s.receiptSize || '80mm',
    showExchangeRate: s.showExchangeRate !== false,
    showQrCode: s.showQrCode !== false,
    requireQuote: s.requireQuote === true,
    receiptFooterNote: s.receiptFooterNote || '',
    printLogoOnReceipt: s.printLogoOnReceipt !== false,
    requireOpenCashSession: s.requireOpenCashSession === true,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm({ defaultValues: toForm({}) })

  useEffect(() => {
    if (!settings) return
    reset(toForm(settings))
    setPrinterConn(settings.printerConnection || 'usb')
    if (settings.exchangeRates) setRates(r => ({ ...r, ...Object.fromEntries(Object.entries(settings.exchangeRates).map(([k, v]) => [k, v ? String(v) : ''])) }))
    else if (settings.exchangeRate) setRates(r => ({ ...r, USD: String(settings.exchangeRate) }))
    if (Array.isArray(settings.visibleCurrencies)) {
      const vis = {}
      CURRENCIES.forEach(c => { vis[c.value] = settings.visibleCurrencies.includes(c.value) })
      setShowRates(vis)
    }
    // eslint-disable-next-line
  }, [settings, reset])

  // ✅ Avèti si w ap kite paj la ak chanjman ki pa sove
  useEffect(() => {
    if (!isDirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  const handleLangChange = (e) => {
    const lang = e.target.value
    setValue('defaultLanguage', lang, { shouldDirty: true })
    i18n.changeLanguage?.(lang)
    try { localStorage.setItem('plusgroup-lang', lang) } catch {}
  }

  const updateMutation = useMutation({
    mutationFn: (data) => tenantAPI.updateSettings({ ...data, taxRate: Number(data.taxRate) || 0, name: data.name.trim(), receiptFooterNote: data.receiptFooterNote?.trim() || '' }),
    onSuccess: (res, data) => {
      const merged = syncTenant({ ...data, ...(res?.data?.tenant || {}) })
      reset(toForm(merged))
      toast.success(tr(t, 'settings.saved', 'Paramèt yo sove'))
    },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')),
  })

  const printerMutation = useMutation({
    mutationFn: (conn) => tenantAPI.updateSettings({ printerConnection: conn }),
    onSuccess: (_, conn) => { syncTenant({ printerConnection: conn }); toast.success(`${tr(t, 'settings.printerUpdated', 'Enprimant mete ajou')}: ${conn.toUpperCase()}`) },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')),
  })

  // ✅ To yo voye kòm NONB; sa ki vid/0 pa voye
  const cleanRates = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v) || 0]).filter(([, v]) => v > 0))

  const rateMutation = useMutation({
    mutationFn: ({ currency, rate }) => {
      const saved = cleanRates({ ...(qc.getQueryData(['tenant-settings'])?.exchangeRates || {}), [currency]: rate })
      return tenantAPI.updateSettings({ exchangeRates: saved, ...(currency === 'USD' ? { exchangeRate: rate } : {}) }).then(res => ({ res, saved }))
    },
    onSuccess: ({ saved }, { currency, rate }) => {
      syncTenant({ exchangeRates: saved, ...(currency === 'USD' ? { exchangeRate: rate } : {}) })
      toast.success(`1 ${currency} = ${fmt(rate)} HTG`)
    },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')),
  })

  const visibilityMutation = useMutation({
    mutationFn: ({ visible }) => tenantAPI.updateSettings({ visibleCurrencies: visible }),
    onSuccess: (_, { visible }) => { syncTenant({ visibleCurrencies: visible }); toast.success(tr(t, 'settings.visibilityUpdated', 'Vizibilite mete ajou')) },
    onError: (e, { prev }) => { setShowRates(prev); toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')) },
  })

  const toggleVisibility = (currency, val) => {
    const prev = showRates
    const updated = { ...showRates, [currency]: val }
    setShowRates(updated)
    visibilityMutation.mutate({ visible: Object.entries(updated).filter(([, v]) => v).map(([k]) => k), prev })
  }

  const uploadLogo = async (file) => {
    if (!file) return
    if (!file.type?.startsWith('image/')) return toast.error('Chwazi yon imaj (PNG, JPG, SVG)')
    if (file.size > MAX_LOGO) return toast.error(`Imaj la twò gwo (${(file.size / 1048576).toFixed(1)} MB). Maksimòm 5 MB.`)
    const fd = new FormData(); fd.append('logo', file)
    setLogoBusy(true)
    try {
      const res = await tenantAPI.uploadLogo(fd)
      syncTenant({ logoUrl: res.data.logoUrl })
      toast.success(tr(t, 'settings.logoUpdated', 'Logo mete ajou'))
    } catch (e) {
      toast.error(e.response?.data?.message || tr(t, 'settings.logoError', 'Pa ka voye logo a'))
    } finally {
      setLogoBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const v = watch()
  const primaryColor = HEX.test(v.primaryColor || '') ? v.primaryColor : '#1B2A8F'
  const set = (k) => (val) => setValue(k, val, { shouldDirty: true })

  const TABS = [
    { key: 'general',  label: tr(t, 'settings.tabs.general', 'Jeneral'),   icon: Building2 },
    { key: 'printer',  label: tr(t, 'settings.tabs.printer', 'Enprimant'), icon: Printer },
    { key: 'currency', label: tr(t, 'settings.tabs.currency', 'Lajan'),    icon: DollarSign },
    { key: 'users',    label: tr(t, 'settings.tabs.users', 'Itilizatè'),   icon: Users },
  ]

  const PRINTER_OPTIONS = [
    { value: 'bluetooth', label: tr(t, 'settings.printer.bluetooth', 'Bluetooth'), desc: tr(t, 'settings.printer.bluetoothDesc', 'Enprimant pòtatif san fil — telefòn oswa tablèt'), icon: Bluetooth, color: '#2563EB' },
    { value: 'usb',       label: tr(t, 'settings.printer.usb', 'USB'),             desc: tr(t, 'settings.printer.usbDesc', 'Branche dirèkteman sou òdinatè a oswa POS la'), icon: Usb, color: '#059669' },
    { value: 'wifi',      label: tr(t, 'settings.printer.wifi', 'Wi-Fi / Rezo'),   desc: tr(t, 'settings.printer.wifiDesc', 'Enprimant pataje sou menm rezo a'), icon: Wifi, color: '#7C3AED' },
  ]
  const pOpt = PRINTER_OPTIONS.find(o => o.value === printerConn) || PRINTER_OPTIONS[1]
  const STEP_FB = {
    bluetooth: ['Limen enprimant lan epi aktive Bluetooth sou aparèy ou.', 'Kouple enprimant lan nan Paramèt Bluetooth Android/ordinatè a.', 'Sou APK a, louvri « Tès enprimant » epi chwazi aparèy la.', 'Enprime yon paj tès pou verifye.'],
    usb: ['Branche kab USB enprimant lan.', 'Enstale chofè (driver) enprimant lan si sa nesesè.', 'Mete l kòm enprimant pa defo nan sistèm nan.', 'Enprime yon resi tès.'],
    wifi: ['Konekte enprimant lan sou menm rezo Wi-Fi a.', 'Note adrès IP enprimant lan (enprime paj konfigirasyon l).', 'Ajoute enprimant lan nan sistèm nan ak adrès IP sa a.', 'Enprime yon resi tès.'],
  }
  const steps = [1, 2, 3, 4].map((n, i) => tr(t, `settings.${printerConn === 'bluetooth' ? 'bt' : printerConn}.step${n}`, STEP_FB[printerConn]?.[i] || ''))

  const calcRate = Number(rates[calc.cur]) || 0
  const calcAmt = Number(calc.amount) || 0
  const calcOut = !calcRate ? 0 : calc.dir === 'toHtg' ? calcAmt * calcRate : calcAmt / calcRate

  // ── Eta chajman / erè
  if (isLoading) return (
    <div className="iv" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="iv-hero" style={{ minHeight: 150 }}/>
      {[70, 45, 85, 60].map((w, i) => <div key={i} className="iv-sk" style={{ width: `${w}%`, marginBottom: 14, height: 18 }}/>)}
    </div>
  )
  if (isError) return (
    <div className="iv"><div className="iv-empty"><h3>Pa ka chaje paramèt yo</h3><p>Verifye koneksyon entènèt ou.</p><button className="iv-act" onClick={() => refetch()}><RefreshCw size={14}/> Eseye ankò</button></div></div>
  )

  return (
    <div className="iv" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: `radial-gradient(circle, ${primaryColor}88, transparent 65%)` }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico slate" style={settings?.logoUrl ? { background: `#fff url(${settings.logoUrl}) center/70% no-repeat` } : undefined}>
            {!settings?.logoUrl && <Settings size={24} color="#fff"/>}
          </div>
          <div className="grow">
            <p className="eyebrow">{settings?.name || 'Antrepriz'}</p>
            <h1>{tr(t, 'settings.title', 'Paramèt')}</h1>
            <div className="meta-line">
              {settings?.plan?.name && <span><Zap size={12}/> Plan {settings.plan.name}</span>}
              <span><Globe size={12}/> {({ ht: 'Kreyòl', fr: 'Français', en: 'English' })[v.defaultLanguage] || 'Kreyòl'}</span>
              <span><DollarSign size={12}/> {v.defaultCurrency || 'HTG'}</span>
              <span><Receipt size={12}/> {v.receiptSize}</span>
              {Number(rates.USD) > 0 && <span>1 USD = {fmt(rates.USD)} HTG</span>}
            </div>
          </div>
        </div>
      </section>

      <nav className="set-tabs" role="tablist">
        {TABS.map(tab => {
          const I = tab.icon
          return (
            <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} className={`set-tab ${activeTab === tab.key ? 'on' : ''}`} onClick={() => setActiveTab(tab.key)}>
              <I size={15}/> <span className="lb">{tab.label}</span>
              {tab.key === 'general' && isDirty && activeTab !== 'general' && <span style={{ width: 7, height: 7, borderRadius: 9, background: 'var(--orange)' }}/>}
            </button>
          )
        })}
      </nav>

      {/* ══════════ JENERAL ══════════ */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="set-grid">
          <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            <section className="iv-sec a-up">
              <SecHead icon={Building2} eb="Idantite" title={tr(t, 'settings.companyInfo', 'Enfòmasyon antrepriz')}/>
              <div className="set-2">
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="iv-lbl">{tr(t, 'settings.companyName', 'Non antrepriz')} *</label>
                  <input className="iv-inp" style={errors.name ? { borderColor: 'var(--bad)' } : undefined} {...register('name', { required: true, validate: x => x.trim().length > 1 })}/>
                  {errors.name && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>Non an obligatwa</small>}
                </div>
                <div>
                  <label className="iv-lbl">{tr(t, 'common.email', 'Email')}</label>
                  <input type="email" className="iv-inp" style={errors.email ? { borderColor: 'var(--bad)' } : undefined} {...register('email', { pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}/>
                  {errors.email && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>Email la pa valid</small>}
                </div>
                <div>
                  <label className="iv-lbl">{tr(t, 'common.phone', 'Telefòn')}</label>
                  <input className="iv-inp" inputMode="tel" placeholder="+509 3000-0000" {...register('phone')}/>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="iv-lbl">{tr(t, 'common.address', 'Adrès')}</label>
                  <input className="iv-inp" placeholder="Ouanaminthe, Ayiti" {...register('address')}/>
                </div>
              </div>
            </section>

            <section className="iv-sec a-up" style={{ animationDelay: '60ms' }}>
              <SecHead icon={Globe} eb="Rejyonal" title="Lang, lajan & taks" color="linear-gradient(135deg,#14B8A6,#0F766E)"/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                <div>
                  <label className="iv-lbl">{tr(t, 'settings.defaultLanguage', 'Lang')}</label>
                  <select className="iv-inp" {...register('defaultLanguage')} onChange={handleLangChange}>
                    <option value="ht">🇭🇹 Kreyòl Ayisyen</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="en">🇺🇸 English</option>
                  </select>
                </div>
                <div>
                  <label className="iv-lbl">{tr(t, 'settings.defaultCurrency', 'Lajan pa defo')}</label>
                  <select className="iv-inp" {...register('defaultCurrency')}>
                    <option value="HTG">🇭🇹 HTG — Goud</option>
                    <option value="USD">🇺🇸 USD — Dola</option>
                    <option value="DOP">🇩🇴 DOP — Peso</option>
                  </select>
                </div>
                <div>
                  <label className="iv-lbl">{tr(t, 'settings.taxRate', 'Taks (%)')}</label>
                  <input type="number" step="0.5" min="0" max="100" inputMode="decimal" className="iv-inp" style={errors.taxRate ? { borderColor: 'var(--bad)' } : undefined}
                    {...register('taxRate', { setValueAs: x => (x === '' || x == null ? 0 : Number(x)), validate: x => x >= 0 && x <= 100 })}/>
                  {errors.taxRate && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>Ant 0 ak 100</small>}
                </div>
                <div>
                  <label className="iv-lbl">{tr(t, 'settings.receiptThermal', 'Papye resi')}</label>
                  <select className="iv-inp" {...register('receiptSize')}>
                    <option value="80mm">{tr(t, 'settings.receipt80mm', '80 mm (estanda)')}</option>
                    <option value="57mm">{tr(t, 'settings.receipt57mm', '57/58 mm (pòtatif)')}</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="iv-sec a-up" style={{ animationDelay: '120ms' }}>
              <SecHead icon={Receipt} eb="Sa ki parèt sou resi a" title="Resi" color="linear-gradient(135deg,#FF6B00,#FF8C33)"/>
              <label className="iv-lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Nòt / avètisman anba resi a</span>
                <span style={{ color: (v.receiptFooterNote?.length || 0) > 180 ? 'var(--warn)' : 'var(--muted)' }}>{v.receiptFooterNote?.length || 0}/200</span>
              </label>
              <textarea className="iv-textarea" maxLength={200} placeholder="Egzanp: Pwodwi vann pa gen ranbousman apre 24è. Mèsi pou konfyans ou!" {...register('receiptFooterNote')}/>
              <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11, margin: '6px 0 14px' }}>Tèks sa a parèt anba TOUT resi yo (web ak APK Android).</small>
              <ToggleRow on={v.showExchangeRate} onChange={set('showExchangeRate')} icon={Eye} offIcon={EyeOff}
                title={tr(t, 'settings.showExchangeRate', 'Montre to chanj sou resi')} desc={v.showExchangeRate ? tr(t, 'settings.showExchangeRateOn', 'Total la ap parèt tou an lòt lajan') : tr(t, 'settings.showExchangeRateOff', 'Sèlman an goud')}/>
              <div style={{ height: 10 }}/>
              <ToggleRow on={v.showQrCode} onChange={set('showQrCode')} icon={QrCode}
                title={tr(t, 'settings.showQrCode', 'QR code sou resi')} desc={v.showQrCode ? tr(t, 'settings.showQrCodeOn', 'Kliyan an ka eskane l pou wè fakti a') : tr(t, 'settings.showQrCodeOff', 'Pa gen QR code')}/>
              <div style={{ height: 10 }}/>
              <ToggleRow on={v.printLogoOnReceipt} onChange={set('printLogoOnReceipt')} icon={Image} offIcon={EyeOff}
                title="Enprime logo sou resi" desc="Dezaktive si logo w la pa soti klè sou enprimant tèmik la (logo ak fon fonse)."/>
            </section>

            <section className="iv-sec a-up" style={{ animationDelay: '180ms' }}>
              <SecHead icon={Workflow} eb="Fason w travay" title="Règ vant" color="linear-gradient(135deg,#C0392B,#E74C3C)"/>
              <ToggleRow on={v.requireQuote} onChange={set('requireQuote')} icon={FileText} color="#FF6B00"
                title={tr(t, 'settings.requireQuote', 'Obligye devi anvan fakti')}
                desc={v.requireQuote ? tr(t, 'settings.requireQuoteOn', 'Chak fakti dwe soti nan yon devi aksepte') : tr(t, 'settings.requireQuoteOff', 'Ou ka fè fakti dirèk san devi')}>
                <div className="set-flow" style={{ borderColor: v.requireQuote ? 'rgba(255,107,0,.35)' : undefined }}>
                  {v.requireQuote ? (
                    <>
                      <span className="p" style={{ background: 'rgba(255,107,0,.1)', color: 'var(--orange)' }}>📋 Devi</span><ChevronRight size={14} color="#94A3B8"/>
                      <span className="p" style={{ background: 'var(--okBg)', color: 'var(--ok)' }}>✅ Aksepte</span><ChevronRight size={14} color="#94A3B8"/>
                      <span className="p" style={{ background: 'var(--infoBg)', color: 'var(--blue)' }}>🧾 Fakti</span>
                    </>
                  ) : (
                    <>
                      <span className="p" style={{ background: 'var(--infoBg)', color: 'var(--blue)' }}>🧾 Fakti dirèk</span>
                      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>· devi a opsyonèl</span>
                    </>
                  )}
                </div>
              </ToggleRow>
              <div style={{ height: 10 }}/>
              <ToggleRow on={v.requireOpenCashSession} onChange={set('requireOpenCashSession')} icon={Lock} color="#C0392B"
                title="Egzije sesyon kès pou vant kach"
                desc="Kesye a dwe louvri yon sesyon kès anvan l fè yon vant kach — sinon kalkil kès la ka manke vant."/>
            </section>

            <section className="iv-sec a-up" style={{ animationDelay: '240ms' }}>
              <SecHead icon={Palette} eb="Mak ou" title="Koulè & logo" color={`linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)`}/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                <div>
                  <label className="iv-lbl">{tr(t, 'settings.primaryColor', 'Koulè prensipal')}</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ width: 48, height: 44, borderRadius: 12, background: primaryColor, flexShrink: 0, cursor: 'pointer', position: 'relative', boxShadow: `0 6px 16px ${primaryColor}55` }} title="Chwazi koulè">
                      <input type="color" value={primaryColor} onChange={e => setValue('primaryColor', e.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}/>
                    </label>
                    <input className="iv-inp mono" placeholder="#1B2A8F" style={errors.primaryColor ? { borderColor: 'var(--bad)' } : undefined}
                      {...register('primaryColor', { pattern: HEX })}/>
                  </div>
                  {errors.primaryColor && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>Fòma: #RRGGBB</small>}
                  <div className="set-colors">
                    {SWATCHES.map(c => <button type="button" key={c} className={primaryColor.toUpperCase() === c ? 'on' : ''} style={{ background: c, '--cc': c }} onClick={() => setValue('primaryColor', c, { shouldDirty: true, shouldValidate: true })} aria-label={c}/>)}
                  </div>
                </div>
                <div>
                  <label className="iv-lbl">{tr(t, 'settings.logo', 'Logo')}</label>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="set-logo" style={settings?.logoUrl ? { backgroundImage: `url(${settings.logoUrl})`, backgroundColor: '#fff' } : undefined}>
                      {logoBusy ? <Spinner size={22} color="var(--blue)"/> : !settings?.logoUrl && (v.name?.[0]?.toUpperCase() || '?')}
                    </div>
                    <div>
                      <button type="button" className="iv-act sky" disabled={logoBusy} onClick={() => fileRef.current?.click()}>
                        {logoBusy ? <Spinner size={13} color="#0284C7"/> : <Upload size={14}/>} {logoBusy ? 'Ap voye…' : tr(t, 'settings.chooseLogo', 'Chwazi logo')}
                      </button>
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={e => uploadLogo(e.target.files?.[0])}/>
                      <small style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>PNG, JPG, SVG · 5 MB max · fon blan pi bon pou resi</small>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Apèsi */}
          <aside style={{ position: 'sticky', top: 16, display: 'grid', gap: 14, minWidth: 0 }}>
            <section className="iv-sec a-up" style={{ animationDelay: '100ms', background: 'linear-gradient(180deg,#EEF0F8,#E3E7F3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span className="iv-lbl" style={{ margin: 0 }}><Eye size={11} style={{ verticalAlign: '-1px' }}/> Apèsi resi a</span>
                <span className="iv-mode" style={{ background: '#fff' }}>{v.receiptSize}</span>
              </div>
              <ReceiptPreview v={v} logoUrl={settings?.logoUrl} rates={rates} visible={showRates}/>
              <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '18px 0 0' }}>Apèsi an dirèk — chanje yon paramèt pou wè rezilta a.</p>
            </section>
            <button type="submit" className="iv-btn-main" disabled={updateMutation.isPending || !isDirty} style={{ width: '100%' }}>
              {updateMutation.isPending ? <Spinner/> : <Save size={16}/>} {updateMutation.isPending ? tr(t, 'common.saving', 'Ap sove…') : isDirty ? tr(t, 'common.save', 'Sove') : 'Tout bagay sove'}
            </button>
          </aside>

          {isDirty && (
            <div className="set-save" style={{ gridColumn: '1/-1' }}>
              <span className="grow">Ou gen chanjman ki pa sove<small>Yo pap aplike tank ou pa sove yo.</small></span>
              <button type="button" className="iv-act" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}
                onClick={() => { reset(toForm(settings || {})); if (settings?.defaultLanguage) i18n.changeLanguage?.(settings.defaultLanguage) }}>
                <Undo2 size={14}/> Anile
              </button>
              <button type="submit" className="iv-btn-main" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Spinner/> : <Save size={15}/>} Sove
              </button>
            </div>
          )}
        </form>
      )}

      {/* ══════════ ENPRIMANT ══════════ */}
      {activeTab === 'printer' && (
        <div className="set-grid">
          <section className="iv-sec a-up">
            <SecHead icon={Printer} eb="Koneksyon" title={tr(t, 'settings.printerConnectionType', 'Tip enprimant')}/>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '-6px 0 16px' }}>{tr(t, 'settings.printerDesc', 'Chwazi kijan aparèy sa a konekte ak enprimant tèmik la.')}</p>
            {PRINTER_OPTIONS.map((o, i) => {
              const I = o.icon, on = printerConn === o.value
              return (
                <button key={o.value} type="button" className={`set-pr a-up ${on ? 'on' : ''}`} style={{ '--pc': o.color, animationDelay: `${i * 60}ms` }} onClick={() => setPrinterConn(o.value)}>
                  <span className="ic"><I size={22}/></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 14, color: on ? o.color : 'var(--ink)' }}>{o.label}</b>
                    <small style={{ fontSize: 12, color: 'var(--muted)' }}>{o.desc}</small>
                  </span>
                  {settings?.printerConnection === o.value && <span className="iv-badge" style={{ background: 'var(--okBg)', color: 'var(--ok)' }}>Aktyèl</span>}
                  <span className="rd">{on && <Check size={13}/>}</span>
                </button>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="iv-btn-main" disabled={printerMutation.isPending || printerConn === (settings?.printerConnection || 'usb')} onClick={() => printerMutation.mutate(printerConn)}>
                {printerMutation.isPending ? <Spinner/> : <Save size={16}/>} {tr(t, 'settings.saveConnection', 'Sove koneksyon an')}
              </button>
            </div>
          </section>

          <div style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
            <section className="iv-sec a-up" style={{ animationDelay: '80ms', '--pc': pOpt.color }}>
              <SecHead icon={pOpt.icon} eb={pOpt.label} title={tr(t, 'settings.printerHowTo', 'Kijan pou konfigire')} color={pOpt.color}/>
              <div className="set-steps" key={printerConn}>
                {steps.map((s, i) => <div key={i} className="a-slide" style={{ animationDelay: `${i * 60}ms` }}>{s}</div>)}
              </div>
            </section>
            <button type="button" className="set-pr a-up" style={{ '--pc': '#FF6B00', animationDelay: '140ms' }} onClick={() => navigate('/app/printer-test')}>
              <span className="ic" style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', color: '#fff' }}><Zap size={22}/></span>
              <span style={{ flex: 1 }}>
                <b style={{ display: 'block', fontSize: 14 }}>Tès enprimant</b>
                <small style={{ fontSize: 12, color: 'var(--muted)' }}>Konekte Bluetooth (APK) epi enprime yon resi tès</small>
              </span>
              <ChevronRight size={18} color="#94A3B8"/>
            </button>
          </div>
        </div>
      )}

      {/* ══════════ LAJAN ══════════ */}
      {activeTab === 'currency' && (
        <div className="set-grid">
          <section className="iv-sec a-up">
            <SecHead icon={ArrowUpDown} eb="To chanj" title={tr(t, 'settings.exchangeRateTitle', 'To chanj')} color="linear-gradient(135deg,#E0B84C,#A87B12)"/>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '-6px 0 16px' }}>{tr(t, 'settings.exchangeRateDesc', 'Konbyen goud pou 1 inite chak lajan. Switch la deside si lajan an parèt sou resi yo.')}</p>
            {CURRENCIES.map((c, i) => {
              const rate = Number(rates[c.value] || 0)
              const saved = Number(settings?.exchangeRates?.[c.value] || (c.value === 'USD' ? settings?.exchangeRate : 0) || 0)
              const changed = rates[c.value] !== '' && Number(rates[c.value]) !== saved
              const vis = !!showRates[c.value]
              const busy = rateMutation.isPending && rateMutation.variables?.currency === c.value
              const save = () => { const r = Number(rates[c.value]); if (!r || r <= 0) return toast.error(tr(t, 'settings.invalidRate', 'To a pa valid')); rateMutation.mutate({ currency: c.value, rate: r }) }
              return (
                <div key={c.value} className={`set-cur a-up ${vis ? '' : 'off'}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="flag">{c.flag}</span>
                      <div><b style={{ fontSize: 15 }}>{c.value}</b><small style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{c.name}</small></div>
                      {saved > 0 && <span className="iv-badge num" style={{ background: 'var(--infoBg)', color: 'var(--blue)', fontSize: 13 }}>1 {c.value} = {fmt(saved)} HTG</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleVisibility(c.value, !vis)}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: vis ? 'var(--blue)' : 'var(--muted)' }}>{vis ? tr(t, 'settings.showOnReceipt', 'Sou resi') : tr(t, 'settings.hideOnReceipt', 'Kache')}</span>
                      <span className={`set-sw ${vis ? 'on' : ''}`} style={{ '--rc': '#1B2A8F' }}/>
                    </div>
                  </div>
                  <div className="bot">
                    <div style={{ flex: 1 }}>
                      <label className="iv-lbl">1 {c.value} = ? HTG</label>
                      <input type="number" step="0.01" min="0" inputMode="decimal" className="iv-inp money" placeholder={`${tr(t, 'settings.eg', 'Egz')}: ${c.eg}`}
                        value={rates[c.value] || ''} onChange={e => setRates(r => ({ ...r, [c.value]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && changed && save()}/>
                      {rate > 0 && <small style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 5 }} className="num">100 {c.value} = {fmt(100 * rate)} HTG · 1 000 HTG = {fmt(1000 / rate)} {c.value}</small>}
                    </div>
                    <button type="button" className="iv-btn-main" disabled={!changed || rateMutation.isPending} onClick={save}
                      style={changed ? { background: 'linear-gradient(135deg,#C9A84C,#8B6914)', boxShadow: '0 10px 22px rgba(201,168,76,.35)' } : undefined}>
                      {busy ? <Spinner/> : changed ? <RefreshCw size={14}/> : <Check size={14}/>} {changed ? tr(t, 'common.update', 'Mete ajou') : 'Sove'}
                    </button>
                  </div>
                </div>
              )
            })}
          </section>

          <aside style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
            <section className="iv-sec a-up" style={{ animationDelay: '100ms' }}>
              <SecHead icon={Calculator} eb="Zouti" title="Kalkilatè" color="linear-gradient(135deg,#14B8A6,#0F766E)"/>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" inputMode="decimal" className="iv-inp money" value={calc.amount} onChange={e => setCalc(s => ({ ...s, amount: e.target.value }))}/>
                  <span className="iv-mode" style={{ alignSelf: 'center', background: 'var(--soft)' }}>{calc.dir === 'toHtg' ? calc.cur : 'HTG'}</span>
                </div>
                <div className="iv-chips" style={{ margin: 0 }}>
                  {CURRENCIES.filter(c => Number(rates[c.value]) > 0).map(c => (
                    <button key={c.value} type="button" className={`iv-chip ${calc.cur === c.value ? 'on' : ''}`} onClick={() => setCalc(s => ({ ...s, cur: c.value }))}>{c.flag} {c.value}</button>
                  ))}
                  <button type="button" className="iv-chip" onClick={() => setCalc(s => ({ ...s, dir: s.dir === 'toHtg' ? 'fromHtg' : 'toHtg' }))} title="Envèse"><ArrowUpDown size={13}/></button>
                </div>
                <div className="iv-rtotal" style={{ margin: 0 }}>
                  <span>=</span>
                  <span className="num">{calcRate ? fmt(calcOut) : '—'}<small>{calc.dir === 'toHtg' ? 'HTG' : calc.cur}</small></span>
                </div>
                {!calcRate && <small style={{ color: 'var(--muted)', fontSize: 11 }}>{tr(t, 'settings.noRates', 'Antre yon to pou lajan sa a anvan.')}</small>}
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* ══════════ ITILIZATÈ ══════════ */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Link to="/app/settings/users" className="set-pr a-up" style={{ '--pc': '#7C3AED', textDecoration: 'none', color: 'inherit' }}>
            <span className="ic" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff' }}><Users size={22}/></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 15 }}>{tr(t, 'settings.manageUsers', 'Jere itilizatè yo')}</b>
              <small style={{ fontSize: 12, color: 'var(--muted)' }}>{tr(t, 'settings.usersDesc', 'Ajoute, modifye, dezaktive manm ekip ou epi chwazi wòl yo.')}</small>
              {settings?.plan?.maxUsers && <small style={{ display: 'block', fontSize: 11.5, color: '#6D28D9', fontWeight: 800, marginTop: 4 }}>Plan {settings.plan.name}: jiska {settings.plan.maxUsers} itilizatè</small>}
            </span>
            <ChevronRight size={18} color="#94A3B8"/>
          </Link>
          {isAdmin ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16, alignItems: 'start' }}>
              <ChangeUserPassword t={t}/>
              <DirectQuotePinSettings t={t}/>
            </div>
          ) : (
            <p className="iv-note"><Lock size={12} style={{ verticalAlign: '-2px' }}/> Se sèlman yon administratè ki ka chanje modpas lòt moun oswa konfigire PIN Devi Dirèk la.</p>
          )}
        </div>
      )}
    </div>
  )
}