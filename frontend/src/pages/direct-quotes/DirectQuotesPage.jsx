// src/pages/direct-quotes/DirectQuotesPage.jsx — Plus Fit redesign
import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import {
  Plus, Search, FileSignature, ChevronLeft, ChevronRight, ShieldCheck, Clock,
  Layers, TrendingUp, PenLine, Send, CheckCircle, FileCheck, XCircle, Eye,
} from 'lucide-react'
import { format } from 'date-fns'
import '../invoices/invoices.css'

const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n) => Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 0 })

// ✅ Tradiksyon ak repli Kreyòl (pa janm montre kle i18n la)
const tr = (t, key, fallback, opts) => {
  const v = t(key, opts)
  return v && v !== key ? v : fallback
}

const STATUS = {
  draft:     { label: 'Bouyon',  color: '#64748B', bg: 'rgba(100,116,139,0.10)', Icon: PenLine },
  sent:      { label: 'Voye',    color: '#2563EB', bg: 'rgba(37,99,235,0.09)',   Icon: Send },
  accepted:  { label: 'Aksepte', color: '#059669', bg: 'rgba(5,150,105,0.10)',   Icon: CheckCircle },
  converted: { label: 'Konvèti', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)',  Icon: FileCheck },
  cancelled: { label: 'Anile',   color: '#DC2626', bg: 'rgba(220,38,38,0.09)',   Icon: XCircle },
}

const AVATAR_COLORS = ['#1B2A8F', '#FF6B00', '#059669', '#7C3AED', '#0284C7', '#DB2777', '#B45309', '#0F766E']
const avatarColor = (s = '') => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'

const toHaitiDate = (d, f) => {
  try { return format(new Date(new Date(d).toLocaleString('en-US', { timeZone: 'America/Port-au-Prince' })), f) } catch { return '' }
}

// ✅ Non "san kliyan" ki te sove kòm tèks (ansyen fòm nan) pa konte kòm vrè kliyan
const NO_CLIENT = ['directQuotes.noClient', 'San kliyan', 'Sans client', 'No client']
const clientOf = (dq) => {
  const n = dq.client?.name || dq.clientSnapshot?.name || ''
  return NO_CLIENT.includes(n) ? '' : n
}

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

function useScreen() {
  const get = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 }
  }
  const [s, setS] = useState(get)
  useEffect(() => {
    const h = () => setS(get())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return s
}

function useCountUp(value, ms = 700) {
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

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, money }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{money ? fmt0(v) : Math.round(v)}{money && <small>HTG</small>}</div>
    </div>
  )
}

export default function DirectQuotesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, user } = useAuthStore()
  const { isMobile, isTablet, isDesktop } = useScreen()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)
  // ✅ NOUVO — debounce: anvan sa CHAK lèt te voye yon demand bay sèvè a
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['direct-quotes', debouncedSearch, status, page],
    queryFn: () => api.get('/direct-quotes', {
      params: { search: debouncedSearch, page, limit: 15, ...(status && status !== 'pending' ? { status } : {}) },
    }).then(r => r.data),
    placeholderData: (prev) => prev,   // ✅ react-query v5 (ranplase keepPreviousData)
    staleTime: 20_000,
  })

  const raw = data?.directQuotes || []
  // ✅ Filt sou kliyan an tou (si backend la pa filtre estati a, lis la rete kòrèk)
  const list = useMemo(() => raw.filter(dq => {
    if (status === 'pending') return !dq.authorizedBy && !dq.authorizer && dq.status !== 'cancelled'
    if (status) return dq.status === status
    return true
  }), [raw, status])

  const { pageValue, pending } = useMemo(() => raw.reduce((a, dq) => {
    if (dq.status !== 'cancelled') a.pageValue += Number(dq.totalHtg || 0)
    if (!dq.authorizedBy && !dq.authorizer && dq.status !== 'cancelled') a.pending += 1
    return a
  }, { pageValue: 0, pending: 0 }), [raw])

  const FILTERS = [
    { v: '', l: 'Tout', color: '#1B2A8F' },
    { v: 'pending', l: 'An atant', color: '#D97706' },
    ...Object.entries(STATUS).map(([k, s]) => ({ v: k, l: tr(t, `directQuotes.status.${k}`, s.label), color: s.color })),
  ]

  return (
    <div className="iv" style={{ paddingBottom: isMobile ? 80 : 24 }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,.5), transparent 65%)' }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#A78BFA" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico violet"><FileSignature size={isMobile ? 20 : 24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Plus Group'}</p>
            <h1>{tr(t, 'directQuotes.title', 'Devi dirèk')}</h1>
            <p className="sub">{tr(t, 'directQuotes.subtitle', 'Devi lib ak foto ak gwosè — admin otorize anvan yo soti.')}</p>
          </div>
          <button onClick={() => navigate('/app/direct-quotes/new')} className="iv-btn-main pulse newbtn">
            <Plus size={17}/> {tr(t, 'directQuotes.newDirectQuote', 'Nouvo devi dirèk')}
          </button>
        </div>
        <div className="iv-kpis">
          <Kpi label="Devi dirèk"  value={data?.total || 0} icon={Layers}     delay={80}/>
          <Kpi label="Valè paj la" value={pageValue}        icon={TrendingUp} delay={160} tone="gold" money/>
          <Kpi label={isAdmin ? 'Pou otorize' : 'An atant'} value={pending} icon={Clock} delay={240} tone={pending ? 'red' : 'green'}/>
        </div>
      </section>

      <div className="iv-bar a-up" style={{ animationDelay: '120ms' }}>
        <div className="iv-search">
          <Search size={16}/>
          <input placeholder={tr(t, 'directQuotes.searchPlaceholder', 'Chèche nimewo oswa kliyan...')} value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}/>
        </div>
        <div className="iv-chips">
          {FILTERS.map(opt => (
            <button key={opt.v} type="button" onClick={() => { setStatus(opt.v); setPage(1) }} className={`iv-chip ${status === opt.v ? 'on' : ''}`}>
              <span className="dot" style={{ background: status === opt.v ? '#fff' : opt.color }}/>
              {opt.l}
              {opt.v === 'pending' && pending > 0 && <b style={{ marginLeft: 2, color: status === 'pending' ? '#FFC83D' : '#D97706' }}>{pending}</b>}
            </button>
          ))}
        </div>
      </div>

      {!isDesktop ? (
        <div className="iv-grid" style={{ gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : '1fr' }}>
          {isLoading
            ? Array(isTablet ? 6 : 4).fill(0).map((_, i) => (
                <div key={i} className="iv-card" style={{ animationDelay: `${i * 60}ms` }}>
                  {[60, 40, 85, 70].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%`, marginBottom: 10 }}/>)}
                </div>
              ))
            : !list.length
            ? <div style={{ gridColumn: '1 / -1' }} className="iv-table"><Empty t={t} filtered={!!(status || debouncedSearch)}/></div>
            : list.map((dq, i) => <DQCard key={dq.id} dq={dq} i={i} t={t}/>)}
        </div>
      ) : (
        <div className="iv-table">
          <div className="iv-thead iv-dqthead">
            {[tr(t, 'directQuotes.colNumber', 'Nimewo'), tr(t, 'directQuotes.colClient', 'Kliyan'), tr(t, 'directQuotes.colCreatedBy', 'Kreye pa'),
              tr(t, 'directQuotes.colTotal', 'Total'), tr(t, 'directQuotes.colStatus', 'Stati'), 'Dat', '']
              .map((h, i) => <span key={i} style={{ textAlign: i >= 3 && i <= 5 ? 'center' : 'left' }}>{h}</span>)}
          </div>
          {isLoading
            ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="iv-tr iv-dqtr" style={{ animationDelay: `${i * 50}ms` }}>
                  {Array(7).fill(0).map((_, j) => <div key={j} className="iv-sk"/>)}
                </div>
              ))
            : !list.length
            ? <Empty t={t} filtered={!!(status || debouncedSearch)}/>
            : list.map((dq, i) => <DQRow key={dq.id} dq={dq} i={i} t={t}/>)}
        </div>
      )}

      {data?.pages > 1 && (
        <div className="iv-pager">
          <p>Paj <b style={{ color: 'var(--ink)' }}>{data.page || page}</b> / {data.pages} · <b style={{ color: 'var(--ink)' }}>{data.total}</b> devi</p>
          <div className="btns">
            <button className="iv-pg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={17}/></button>
            <button className="iv-pg" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={17}/></button>
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ t, filtered }) {
  return (
    <div className="iv-empty">
      <div className="art">
        <div className="paper"><i/><i/><i/><i/><i/></div>
        <div className="bubble" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>{filtered ? <Search size={18}/> : <Plus size={20}/>}</div>
      </div>
      <h3>{filtered ? 'Anyen pa koresponn' : tr(t, 'directQuotes.noResults', 'Pa gen devi dirèk')}</h3>
      <p>{filtered ? 'Eseye yon lòt rechèch oswa chanje filt la.' : 'Kreye yon devi lib — ak foto ak gwosè chak atik.'}</p>
      {!filtered && <Link to="/app/direct-quotes/new" className="iv-btn-main"><Plus size={16}/> Nouvo devi dirèk</Link>}
    </div>
  )
}

function useDQView(dq) {
  return useMemo(() => {
    const name = clientOf(dq)
    const isPending = !dq.authorizedBy && !dq.authorizer && dq.status !== 'cancelled'
    return {
      s: STATUS[dq.status] || STATUS.draft,
      name: name || 'San kliyan',
      walk: !name,
      isPending,
      authorized: !!(dq.authorizer || dq.authorizedBy),
      date: toHaitiDate(dq.createdAt || dq.issueDate, 'dd/MM/yy'),
      photos: (dq.items || []).filter(it => it.imageUrl).slice(0, 3),
      itemCount: dq.items?.length || dq._count?.items || 0,
    }
  }, [dq])
}

function Badge({ dq, v, t }) {
  if (v.isPending) return <span className="iv-badge" style={{ background: 'rgba(217,119,6,.12)', color: '#D97706' }}><Clock size={11}/>An atant</span>
  const I = v.s.Icon
  return <span className="iv-badge" style={{ background: v.s.bg, color: v.s.color }}><I size={11}/>{tr(t, `directQuotes.status.${dq.status}`, v.s.label)}</span>
}

function Avatar({ v }) {
  return <div className="iv-avatar" style={{ background: v.walk ? '#CBD2E6' : avatarColor(v.name) }}>{v.walk ? <FileSignature size={15}/> : initials(v.name)}</div>
}

function Photos({ v }) {
  if (!v.photos.length) return null
  return (
    <div style={{ display: 'flex', marginTop: 4 }}>
      {v.photos.map((it, k) => (
        <span key={it.id || k} className="iv-thumb" style={{ width: 22, height: 22, borderRadius: 6, marginLeft: k ? -6 : 0, border: '2px solid #fff', backgroundImage: `url(${it.imageUrl})` }}/>
      ))}
    </div>
  )
}

const DQCard = memo(function DQCard({ dq, i, t }) {
  const v = useDQView(dq)
  const navigate = useNavigate()
  return (
    <div className="iv-card" style={{ '--acc': v.isPending ? '#D97706' : v.s.color, animationDelay: `${Math.min(i, 10) * 45}ms`, cursor: 'pointer' }}
      onClick={() => navigate(`/app/direct-quotes/${dq.id}`)}>
      <div className="top">
        <span className="iv-num" style={{ color: '#6D28D9' }}>{dq.quoteNumber}</span>
        <Badge dq={dq} v={v} t={t}/>
      </div>
      <div className="mid">
        <div className="iv-client">
          <Avatar v={v}/>
          <div style={{ minWidth: 0 }}>
            <span className={`name ${v.walk ? 'walk' : ''}`}>{v.name}</span>
            <div className="iv-item" style={{ marginTop: 2 }}>
              {dq.creator?.fullName}{v.authorized && <ShieldCheck size={11} color="#7C3AED" style={{ marginLeft: 3 }}/>}
            </div>
          </div>
        </div>
        <span className="iv-date" style={{ flexShrink: 0 }}>{v.date}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, borderTop: '1px dashed var(--line2)' }}>
        <div>
          <div style={{ font: "800 9px 'Manrope', sans-serif", letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total</div>
          <div className="iv-money" style={{ fontSize: 22 }}>{fmt(dq.totalHtg)} <small style={{ fontSize: 11, color: 'var(--muted)' }}>HTG</small></div>
        </div>
        <Photos v={v}/>
      </div>
    </div>
  )
})

const DQRow = memo(function DQRow({ dq, i, t }) {
  const v = useDQView(dq)
  return (
    <Link to={`/app/direct-quotes/${dq.id}`} className="iv-tr iv-dqtr" style={{ '--acc': v.isPending ? '#D97706' : v.s.color, animationDelay: `${Math.min(i, 14) * 35}ms` }}>
      <span className="iv-num" style={{ color: '#6D28D9' }}>{dq.quoteNumber}</span>
      <div className="iv-client">
        <Avatar v={v}/>
        <div style={{ minWidth: 0 }}>
          <span className={`name ${v.walk ? 'walk' : ''}`}>{v.name}</span>
          <Photos v={v}/>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 600, minWidth: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dq.creator?.fullName || '—'}</span>
        {v.authorized && (
          <span title={tr(t, 'directQuotes.authorizedByTooltip', `Otorize pa ${dq.authorizer?.fullName || 'admin'}`, { name: dq.authorizer?.fullName })}>
            <ShieldCheck size={13} color="#7C3AED"/>
          </span>
        )}
      </div>
      <div style={{ textAlign: 'center' }}><div className="iv-money">{fmt(dq.totalHtg)}</div></div>
      <div style={{ textAlign: 'center' }}><Badge dq={dq} v={v} t={t}/></div>
      <span className="iv-date" style={{ textAlign: 'center' }}>{v.date}</span>
      <div style={{ textAlign: 'right' }}><span className="iv-eye"><Eye size={15}/></span></div>
    </Link>
  )
})