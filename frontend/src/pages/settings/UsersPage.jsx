// src/pages/settings/UsersPage.jsx — Plus Fit redesign
// ✅ KORIJE: invalidateQueries te nan fòma v4 (lis la pa t rafrechi apre kreye/modifye);
//            pa t gen mesaj erè si sèvè a refize; paj la te kraze si yon itilizatè pa gen non
//            (u.fullName.charAt); dènye koneksyon an pa t an lè Ayiti; tout objè itilizatè a
//            (id, createdAt…) te voye bay sèvè a lè w modifye; admin te ka dezaktive pwòp kont li
// ✅ NOUVO:  KPI, rechèch, filt pa wòl ak estati, switch aktif/inaktif rapid sou chak kat,
//            jeneratè modpas + endikatè fòs, limit plan an, fenèt modèn ak kat wòl
import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Users, UserPlus, Search, X, Eye, EyeOff, Edit2, Shield, ShoppingCart, Package,
  Clock, Phone, Mail, Check, Wand2, Copy, UserCheck, UserX, Crown,
} from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import '../invoices/invoices.css'

const fetchUsers = () => api.get('/users').then(r => r.data?.users || r.data || [])

// Evite montre kle i18n la si tradiksyon an manke
const tr = (t, k, fb) => { const v = t(k); return v && v !== k ? v : fb }

const getRoles = (t) => [
  { value: 'admin',         icon: Crown,        color: '#7C3AED', label: tr(t, 'users.roles.admin', 'Administratè'),        desc: tr(t, 'users.roles.adminDesc', 'Aksè total: paramèt, rapò, itilizatè') },
  { value: 'cashier',       icon: ShoppingCart, color: '#2563EB', label: tr(t, 'users.roles.cashier', 'Kesye'),                desc: tr(t, 'users.roles.cashierDesc', 'Vann, fè fakti ak devi, resevwa peman') },
  { value: 'stock_manager', icon: Package,      color: '#D97706', label: tr(t, 'users.roles.stockManager', 'Jesyonè estòk'),   desc: tr(t, 'users.roles.stockManagerDesc', 'Pwodui, antre/sòti estòk, kontwòl') },
  { value: 'viewer',        icon: Eye,          color: '#64748B', label: tr(t, 'users.roles.viewer', 'Obsèvatè'),              desc: tr(t, 'users.roles.viewerDesc', 'Wè sèlman — pa ka modifye anyen') },
]

const TZ = 'America/Port-au-Prince'
const dayKey = (d) => new Date(d).toLocaleDateString('fr-CA', { timeZone: TZ })
const fmtLogin = (d) => {
  if (!d) return null
  const time = new Date(d).toLocaleTimeString('fr-HT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const k = dayKey(d), today = dayKey(Date.now()), yest = dayKey(Date.now() - 864e5)
  if (k === today) return `Jodi a ${time}`
  if (k === yest) return `Yè ${time}`
  return new Date(d).toLocaleDateString('fr-HT', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + time
}
const initials = (name, email) => {
  const s = (name || email || '?').trim()
  const p = s.split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

const pwScore = (p = '') => {
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++
  return Math.max(1, s)
}
const PW_C = ['#E2E8F0', '#DC2626', '#D97706', '#2563EB', '#059669']
const PW_L = ['', 'Fèb', 'Mwayen', 'Bon', 'Fò']
const genPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const sym = '@#$%&*'
  const rnd = (n) => { try { return crypto.getRandomValues(new Uint32Array(1))[0] % n } catch { return Math.floor(Math.random() * n) } }
  let s = ''
  for (let i = 0; i < 9; i++) s += chars[rnd(chars.length)]
  return s + sym[rnd(sym.length)] + rnd(10) + rnd(10)
}

function useEsc(fn) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') fn?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fn])
}

function useCountUp(value, ms = 600) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, suffix }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{Math.round(v)}{suffix && <small>{suffix}</small>}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Fenèt kreye / modifye
// ════════════════════════════════════════════════════════════
function UserModal({ user, isSelf, onClose }) {
  const isEdit = !!user
  const qc = useQueryClient()
  const { t } = useTranslation()
  const ROLES = getRoles(t)
  const [showPwd, setShowPwd] = useState(false)
  useEsc(onClose)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: isEdit
      ? { fullName: user.fullName || '', email: user.email || '', role: user.role || 'cashier', phone: user.phone || '', preferredLang: user.preferredLang || 'ht', isActive: user.isActive !== false }
      : { fullName: '', email: '', password: '', role: 'cashier', phone: '', preferredLang: 'ht' },
  })
  const role = watch('role')
  const pwd = watch('password') || ''
  const isActive = watch('isActive')
  const score = pwScore(pwd)

  const mutation = useMutation({
    mutationFn: (d) => {
      // ✅ Voye SÈLMAN chan ki ka chanje yo
      const body = { fullName: d.fullName.trim(), role: d.role, phone: d.phone?.trim() || null, preferredLang: d.preferredLang }
      if (isEdit) return api.put(`/users/${user.id}`, { ...body, isActive: !!d.isActive })
      return api.post('/users', { ...body, email: d.email.trim().toLowerCase(), password: d.password })
    },
    onSuccess: () => {
      toast.success(isEdit ? tr(t, 'users.updated', 'Itilizatè modifye') : tr(t, 'users.created', 'Itilizatè kreye'))
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['tenant-users'] })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')),
  })

  const generate = () => {
    const p = genPassword()
    setValue('password', p, { shouldValidate: true, shouldDirty: true })
    setShowPwd(true)
    try { navigator.clipboard?.writeText(p); toast.success('Modpas jenere epi kopye') } catch { toast.success('Modpas jenere') }
  }

  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 560 }}>
        <div className="iv-sheet-h">
          <h3>{isEdit ? <><Edit2 size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'users.editUser', 'Modifye itilizatè')}</> : <><UserPlus size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'users.newUser', 'Nouvo itilizatè')}</>}</h3>
          <p>{isEdit ? (user.email || '') : 'Kreye yon kont pou yon manm ekip ou'}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <form className="iv-sheet-b" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div>
            <label className="iv-lbl">{tr(t, 'users.fullName', 'Non konplè')} *</label>
            <input className="iv-inp" placeholder="Jean Baptiste" autoFocus={!isEdit} style={errors.fullName ? { borderColor: 'var(--bad)' } : undefined}
              {...register('fullName', { required: true, validate: v => v.trim().length >= 2 })}/>
            {errors.fullName && <small style={{ color: 'var(--bad)', fontSize: 11 }}>Antre non konplè a (2 karaktè minimòm)</small>}
          </div>

          <div>
            <label className="iv-lbl">Email *</label>
            <div className="iv-icon-inp">
              <Mail size={15}/>
              <input type="email" className="iv-inp" placeholder="user@entreprise.ht" disabled={isEdit} autoComplete="off"
                style={errors.email ? { borderColor: 'var(--bad)' } : undefined}
                {...register('email', { required: !isEdit, pattern: isEdit ? undefined : /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}/>
            </div>
            {errors.email && <small style={{ color: 'var(--bad)', fontSize: 11 }}>Email la pa valid</small>}
            {isEdit && <small style={{ color: 'var(--muted)', fontSize: 11 }}>Email la pa ka chanje — se idantifyan koneksyon an.</small>}
          </div>

          {!isEdit && (
            <div>
              <label className="iv-lbl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{tr(t, 'users.password', 'Modpas')} *</span>
                <button type="button" onClick={generate} style={{ border: 'none', background: 'none', color: 'var(--blue)', font: "800 11px 'Manrope',sans-serif", cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
                  <Wand2 size={12}/> Jenere youn
                </button>
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} className="iv-inp mono" autoComplete="new-password" style={{ paddingRight: 84, ...(errors.password ? { borderColor: 'var(--bad)' } : {}) }}
                  placeholder={tr(t, 'users.passwordPlaceholder', '8 karaktè minimòm')}
                  {...register('password', { required: true, minLength: 8 })}/>
                <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
                  {pwd && <button type="button" className="iv-mini" style={{ border: 'none', background: 'transparent' }} title="Kopye" onClick={() => { navigator.clipboard?.writeText(pwd); toast.success('Kopye') }}><Copy size={14}/></button>}
                  <button type="button" className="iv-mini" style={{ border: 'none', background: 'transparent' }} onClick={() => setShowPwd(s => !s)} aria-label="Montre modpas">{showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
                </div>
              </div>
              {pwd && (
                <>
                  <div className="pw-meter">{[1, 2, 3, 4].map(i => <i key={i} style={{ background: score >= i ? PW_C[score] : undefined }}/>)}</div>
                  <small style={{ fontSize: 11, fontWeight: 800, color: PW_C[score] }}>{PW_L[score]}{pwd.length < 8 && ` · ${8 - pwd.length} karaktè ankò`}</small>
                </>
              )}
            </div>
          )}

          <div>
            <label className="iv-lbl">{tr(t, 'users.role', 'Wòl')}</label>
            <div className="us-role">
              {ROLES.map(r => {
                const Icon = r.icon
                // ✅ Yon admin pa ka retire pwòp dwa admin li (li ta bloke tèt li deyò)
                const locked = isSelf && r.value !== 'admin'
                return (
                  <button type="button" key={r.value} disabled={locked} className={role === r.value ? 'on' : ''} style={{ '--rc': r.color }}
                    onClick={() => setValue('role', r.value, { shouldDirty: true })} title={locked ? 'Ou pa ka retire pwòp dwa admin ou' : undefined}>
                    <span className="ri"><Icon size={16}/></span>
                    <span><b>{r.label}</b><small>{r.desc}</small></span>
                  </button>
                )
              })}
            </div>
            <input type="hidden" {...register('role')}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label className="iv-lbl">{tr(t, 'common.phone', 'Telefòn')}</label>
              <div className="iv-icon-inp"><Phone size={15}/><input className="iv-inp" inputMode="tel" placeholder="+509 3000-0000" {...register('phone')}/></div>
            </div>
            <div>
              <label className="iv-lbl">{tr(t, 'users.preferredLang', 'Lang')}</label>
              <select className="iv-inp" {...register('preferredLang')}>
                <option value="ht">🇭🇹 Kreyòl</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>

          {isEdit && (
            <div className={`set-row ${isActive ? 'on' : ''}`} style={{ '--rc': isActive ? '#059669' : '#DC2626', opacity: isSelf ? .6 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
              onClick={() => !isSelf && setValue('isActive', !isActive, { shouldDirty: true })}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="ic">{isActive ? <UserCheck size={17}/> : <UserX size={17}/>}</span>
                <div>
                  <b>{isActive ? tr(t, 'users.activeAccount', 'Kont aktif') : 'Kont dezaktive'}</b>
                  <small>{isSelf ? 'Ou pa ka dezaktive pwòp kont ou' : isActive ? 'Moun sa a ka konekte' : 'Moun sa a pa ka konekte ankò'}</small>
                </div>
              </div>
              <span className={`set-sw ${isActive ? 'on' : ''}`}/>
              <input type="hidden" {...register('isActive')}/>
            </div>
          )}

          <div className="iv-sheet-f">
            <button type="button" className="iv-act" onClick={onClose}>{tr(t, 'common.cancel', 'Anile')}</button>
            <button type="submit" className="iv-btn-main" disabled={mutation.isPending}>
              {mutation.isPending ? <><span className="spin" style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}/> {tr(t, 'common.saving', 'Ap sove…')}</>
                : <><Check size={16}/> {isEdit ? tr(t, 'common.update', 'Mete ajou') : tr(t, 'users.createUser', 'Kreye itilizatè')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function UsersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const { user: me, tenant } = useAuthStore()
  const ROLES = getRoles(t)
  const roleOf = (v) => ROLES.find(r => r.value === v) || ROLES[3]

  const [modal, setModal] = useState(null)
  const [q, setQ] = useState('')
  const [roleF, setRoleF] = useState('')
  const [statF, setStatF] = useState('')

  const { data: users = [], isLoading, isError, refetch } = useQuery({ queryKey: ['users'], queryFn: fetchUsers, staleTime: 60_000 })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/users/${id}`, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: ['users'] })
      const prev = qc.getQueryData(['users'])
      qc.setQueryData(['users'], old => (old || []).map(u => u.id === id ? { ...u, isActive } : u))
      return { prev }
    },
    onError: (e, _, ctx) => { qc.setQueryData(['users'], ctx?.prev); toast.error(e.response?.data?.message || 'Pa ka chanje estati a') },
    onSuccess: (_, { isActive }) => toast.success(isActive ? 'Kont aktive' : 'Kont dezaktive'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const stats = useMemo(() => {
    const s = { total: users.length, active: 0, admin: 0, by: {} }
    users.forEach(u => { if (u.isActive !== false) s.active++; if (u.role === 'admin') s.admin++; s.by[u.role] = (s.by[u.role] || 0) + 1 })
    return s
  }, [users])

  const list = useMemo(() => {
    const k = q.trim().toLowerCase()
    return users
      .filter(u => !roleF || u.role === roleF)
      .filter(u => !statF || (statF === 'on' ? u.isActive !== false : u.isActive === false))
      .filter(u => !k || [u.fullName, u.email, u.phone].some(x => (x || '').toLowerCase().includes(k)))
      .sort((a, b) => (b.isActive !== false) - (a.isActive !== false) || (a.fullName || '').localeCompare(b.fullName || ''))
  }, [users, q, roleF, statF])

  const maxUsers = tenant?.plan?.maxUsers || tenant?.maxUsers || null
  const atLimit = maxUsers && stats.active >= maxUsers

  return (
    <div className="iv" style={{ maxWidth: 980, margin: '0 auto' }}>
      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button className="back" onClick={() => navigate('/app/settings')} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico violet"><Users size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || tr(t, 'settings.title', 'Paramèt')}</p>
            <h1>{tr(t, 'settings.tabs.users', 'Itilizatè')}</h1>
            <p className="sub">Jere ekip ou: kiyès ki ka konekte, ak sa chak moun gen dwa fè.</p>
          </div>
          <button className="iv-btn-main hx" disabled={!!atLimit} title={atLimit ? 'Limit plan an rive' : undefined} onClick={() => setModal({ type: 'create' })}>
            <UserPlus size={16}/> {tr(t, 'users.newUser', 'Nouvo itilizatè')}
          </button>
        </div>
        <div className="iv-kpis">
          <Kpi label="Total" value={stats.total} icon={Users} delay={80} suffix={maxUsers ? `/ ${maxUsers}` : undefined}/>
          <Kpi label="Aktif" value={stats.active} icon={UserCheck} delay={160} tone="green"/>
          <Kpi label="Admin" value={stats.admin} icon={Shield} delay={240} tone="gold"/>
        </div>
      </section>

      {atLimit && (
        <div className="iv-banner pend"><span className="ic"><Crown size={16}/></span><span className="grow">Ou rive nan limit plan <b>{tenant?.plan?.name || ''}</b> ({maxUsers} itilizatè aktif). Dezaktive yon kont oswa monte plan an pou ajoute lòt moun.</span></div>
      )}

      <div className="iv-bar">
        <div className="iv-search">
          <Search size={16}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chèche non, email, telefòn…"/>
        </div>
        <div className="iv-chips">
          <button className={`iv-chip ${!roleF ? 'on' : ''}`} onClick={() => setRoleF('')}>Tout <b className="num">{stats.total}</b></button>
          {ROLES.filter(r => stats.by[r.value]).map(r => (
            <button key={r.value} className={`iv-chip ${roleF === r.value ? 'on' : ''}`} onClick={() => setRoleF(roleF === r.value ? '' : r.value)}>
              <span className="dot" style={{ background: r.color }}/> {r.label} <b className="num">{stats.by[r.value]}</b>
            </button>
          ))}
          <button className={`iv-chip ${statF === 'off' ? 'on' : ''}`} onClick={() => setStatF(statF === 'off' ? '' : 'off')}>
            <span className="dot" style={{ background: 'var(--bad)' }}/> Inaktif <b className="num">{stats.total - stats.active}</b>
          </button>
        </div>
      </div>

      {isError ? (
        <div className="iv-empty"><h3>Pa ka chaje lis la</h3><p>Verifye koneksyon entènèt ou.</p><button className="iv-act" onClick={() => refetch()}>Eseye ankò</button></div>
      ) : isLoading ? (
        [0, 1, 2].map(i => (
          <div key={i} className="us-card" style={{ cursor: 'default' }}>
            <div className="iv-sk" style={{ width: 48, height: 48, borderRadius: 15 }}/>
            <div style={{ flex: 1 }}><div className="iv-sk" style={{ width: '40%', marginBottom: 8 }}/><div className="iv-sk" style={{ width: '25%' }}/></div>
          </div>
        ))
      ) : !list.length ? (
        <div className="iv-empty">
          <div className="art"><div className="paper"><i/><i/><i/><i/></div><div className="bubble"><Users size={18}/></div></div>
          <h3>{users.length ? 'Okenn rezilta' : 'Poko gen itilizatè'}</h3>
          <p>{users.length ? 'Chanje rechèch la oswa filt yo.' : 'Ajoute premye manm ekip ou.'}</p>
          {users.length ? <button className="iv-act" onClick={() => { setQ(''); setRoleF(''); setStatF('') }}>Efase filt yo</button>
            : <button className="iv-btn-main" onClick={() => setModal({ type: 'create' })}><UserPlus size={16}/> Ajoute</button>}
        </div>
      ) : (
        <div>
          {list.map((u, i) => {
            const r = roleOf(u.role)
            const RIcon = r.icon
            const active = u.isActive !== false
            const self = me?.id && me.id === u.id
            const login = fmtLogin(u.lastLoginAt)
            return (
              <div key={u.id} className={`us-card ${active ? '' : 'off'}`} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }} onClick={() => setModal({ type: 'edit', user: u })}>
                <div className="us-av" style={{ background: `linear-gradient(135deg, ${r.color}, ${r.color}cc)`, '--dot': active ? '#10B981' : '#CBD5E1' }}>
                  {initials(u.fullName, u.email)}<i/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.fullName || u.email || '—'}</b>
                    {self && <span className="iv-badge" style={{ background: 'var(--infoBg)', color: 'var(--info)' }}>Ou menm</span>}
                    <span className="iv-badge" style={{ background: `${r.color}18`, color: r.color }}><RIcon size={11}/> {r.label}</span>
                    {!active && <span className="iv-badge" style={{ background: 'var(--badBg)', color: 'var(--bad)' }}>{tr(t, 'users.inactive', 'Inaktif')}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {u.email && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}><Mail size={12}/> {u.email}</span>}
                    {u.phone && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Phone size={12}/> {u.phone}</span>}
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Clock size={12}/> {login || 'Poko janm konekte'}</span>
                  </div>
                </div>
                <button type="button" className={`set-sw ${active ? 'on' : ''}`} disabled={self || toggleActive.isPending}
                  title={self ? 'Ou pa ka dezaktive pwòp kont ou' : active ? 'Dezaktive' : 'Aktive'}
                  style={{ opacity: self ? .4 : 1, cursor: self ? 'not-allowed' : 'pointer' }}
                  onClick={e => { e.stopPropagation(); if (!self) toggleActive.mutate({ id: u.id, isActive: !active }) }}/>
                <button type="button" className="iv-mini" aria-label="Modifye" onClick={e => { e.stopPropagation(); setModal({ type: 'edit', user: u }) }}><Edit2 size={14}/></button>
              </div>
            )
          })}
        </div>
      )}

      {modal && <UserModal user={modal.type === 'edit' ? modal.user : null} isSelf={modal.type === 'edit' && me?.id === modal.user?.id} onClose={() => setModal(null)}/>}
    </div>
  )
}