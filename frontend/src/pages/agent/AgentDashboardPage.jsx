// src/pages/agent/AgentDashboardPage.jsx
// ESPAS AJAN PLUSGROUP — yon sèl paj pou tout pwogram ajan yo:
//   • Ajan Komèsyal + Ajan Gestion Stock (backend PlusGroup: /agents/dashboard)
//   • Ajan Plus Lotterie (backend lotri a: kont lotri a konekte YON fwa isit la)
// Design "Espace Agent": antèt, karousèl kontra, 3 pwogram, grafik komisyon,
// aksyon rapid, navigasyon anba (Akèy · Kliyan · Komisyon · Pwogram · Pwofil).
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import {
  Bell, User, Users, Coins, Layers, ShoppingCart, Package, Link2, Image as ImageIcon, Wallet, Home,
  BarChart3, Zap, Copy, LogOut, Plus, X, Trophy, CheckCircle2, TrendingUp, ArrowRight, ExternalLink, Crown,
} from 'lucide-react'
import { agentApi, clearAgent } from '../../services/agentApi'
import { lotteryAgentApi, getLotterySession, LOTTERY_SITE } from '../../services/lotteryAgentApi'
import './agent-dashboard.css'

const LOGO_URL = '/assets/logo.webp'
const BANNER_URL = '/assets/banner-konkou.png'
const APP_URL = 'https://app.plusgroupe.com'
const PLUS_WA = '50942449024'

// ⚠️ Dwe rete SENKRONIZE ak PLAN_PRICE_RULES nan tenant-signup.service.js
const PLAN_PRICE_RULES = {
  'Estanda':  { min: 3000, max: null },
  'Biznis':   { min: 3500, max: 4500 },
  'Premyum':  { min: 4000, max: null },
  'Antrepriz': { min: 5000, max: null },
}

const C = {
  navy: '#0F172A', orange: '#F97316', orangeDark: '#EA580C', orangeLight: '#FDBA74',
  white: '#FFFFFF', bg: '#F1F5F9', blue: '#2563EB', green: '#16A34A', danger: '#EF4444',
  border: '#E2E8F0', textMuted: '#64748B'
}

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const cf = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
const htg = (n) => `${nf.format(Number(n) || 0)} HTG`
const short = (n) => cf.format(Number(n) || 0)
const dateFr = (v) => (v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const MONTHS = ['jan', 'fev', 'mas', 'avr', 'me', 'jen', 'jiy', 'out', 'sep', 'okt', 'nov', 'des']

const PROMO_SLIDES = [
  { type: 'image' },
  { type: 'card', tone: 'a', icon: Trophy, title: '100,000 HTG', text: 'Pou fèt fen ane a — bay 3 pi gwo Ajan Sistèm yo.' },
  { type: 'card', tone: 'b', icon: Coins, title: '2% a 5%', text: 'Ajan Plus Lotterie: sou chak fich kliyan ou yo jwe.' },
  { type: 'card', tone: 'c', icon: Wallet, title: 'Komisyon chak mwa', text: 'Pou tout tan yon antrepriz ou mennen rete abòne.' },
]

function Promo() {
  const [i, setI] = useState(0)
  const [imgOk, setImgOk] = useState(true)
  const slides = imgOk ? PROMO_SLIDES : PROMO_SLIDES.filter((s) => s.type !== 'image')
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [slides.length])
  return (
    <section className="pga-promo" aria-roledescription="karousèl" aria-label="Pwomosyon">
      <div className="pga-promo__track" style={{ transform: `translateX(-${(i % slides.length) * 100}%)` }}>
        {slides.map((s, n) => s.type === 'image' ? (
          <div key="img" className="pga-promo__slide pga-promo__slide--img">
            <img src={BANNER_URL} alt="Konkou Ajan — 100,000 HTG" onError={() => setImgOk(false)} />
          </div>
        ) : (
          <div key={n} className={`pga-promo__slide pga-promo__slide--${s.tone}`}>
            <span className="pga-promo__icon"><s.icon size={26} /></span>
            <div style={{ minWidth: 0 }}><strong>{s.title}</strong><p>{s.text}</p></div>
          </div>
        ))}
      </div>
      <div className="pga-promo__dots">
        {slides.map((_, n) => <button key={n} type="button" className={n === i % slides.length ? 'on' : ''} aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} />)}
      </div>
    </section>
  )
}

// Grafik komisyon (6 dènye mwa) — SVG, san bibliyotèk
function Chart({ points }) {
  const W = 300, H = 124, P = 12
  const max = Math.max(1, ...points.map((p) => p.v))
  const xy = points.map((p, i) => [P + (i * (W - 2 * P)) / Math.max(1, points.length - 1), H - 22 - ((p.v / max) * (H - 22 - P))])
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg className="pga-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
      aria-label={`Komisyon pa mwa: ${points.map((p) => `${p.l} ${nf.format(p.v)} HTG`).join(', ')}`}>
      <defs><linearGradient id="pgafill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6d3ae0" stopOpacity=".35" /><stop offset="1" stopColor="#6d3ae0" stopOpacity="0" /></linearGradient></defs>
      {[0.33, 0.66].map((g) => <line key={g} x1={P} x2={W - P} y1={P + g * (H - 22 - P)} y2={P + g * (H - 22 - P)} stroke="#e6ebf5" />)}
      <path d={`${line} L${xy[xy.length - 1][0]},${H - 22} L${xy[0][0]},${H - 22} Z`} fill="url(#pgafill)" />
      <path d={line} fill="none" stroke="#4b2bd6" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#fff" stroke="#4b2bd6" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      {xy.map(([x], i) => <text key={`t${i}`} x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">{points[i].l}</text>)}
    </svg>
  )
}

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="pga-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pga-sheet__panel">
        <div className="pga-sheet__head"><h3>{title}</h3><button type="button" onClick={onClose} aria-label="Fèmen"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  )
}

// Flyer pou pataje (QR + kòd), telechaje an PNG
async function makeFlyer({ title, subtitle, link, code, footer }) {
  const c = document.createElement('canvas')
  c.width = 1080; c.height = 1350
  const g = c.getContext('2d')
  const bg = g.createLinearGradient(0, 0, 0, 1350)
  bg.addColorStop(0, '#1450e0'); bg.addColorStop(0.55, '#0a2364'); bg.addColorStop(1, '#061440')
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350)
  g.fillStyle = '#f97316'; g.fillRect(0, 1250, 1080, 100)
  g.textAlign = 'center'
  g.fillStyle = '#ffc21a'; g.font = '900 84px Arial, sans-serif'; g.fillText(title.slice(0, 22), 540, 200)
  g.fillStyle = '#dbe5ff'; g.font = '600 40px Arial, sans-serif'; g.fillText(subtitle.slice(0, 48), 540, 280)
  const qr = await QRCode.toDataURL(link, { width: 560, margin: 2, color: { dark: '#0a2364', light: '#ffffff' } })
  const img = new Image()
  await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = qr })
  g.fillStyle = '#fff'; g.fillRect(250, 360, 580, 580)
  g.drawImage(img, 260, 370, 560, 560)
  g.fillStyle = '#fff'; g.font = '700 44px Arial, sans-serif'; g.fillText('Eskane QR kòd la', 540, 1030)
  g.fillStyle = '#ffc21a'; g.font = '800 52px Arial, sans-serif'; g.fillText(`Kòd ajan: ${code}`, 540, 1120)
  g.fillStyle = '#fff'; g.font = '700 36px Arial, sans-serif'; g.fillText(footer, 540, 1312)
  return c.toDataURL('image/png')
}

/* ─── Kont Plus Lotterie: konekte / kreye (yon sèl fwa) ─── */
function LotteryConnect({ agent, onDone }) {
  const [mode, setMode] = useState('register')
  const [programs, setPrograms] = useState([])
  const [f, setF] = useState({
    identifier: agent.promoCode || '', password: '', fullName: agent.fullName || '', phone: agent.phone || '',
    email: agent.email || '', city: agent.city || '', natcash: '', slug: '', adult: false, agree: false,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { lotteryAgentApi.programs().then(setPrograms).catch(() => setPrograms([])) }, [])
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); setErr('') }
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      if (mode === 'login') await lotteryAgentApi.login(f.identifier, f.password)
      else await lotteryAgentApi.register({ fullName: f.fullName, phone: f.phone, email: f.email || undefined, city: f.city, natcash: f.natcash || undefined, password: f.password, slug: f.slug || undefined, adult: f.adult, agree: f.agree })
      toast.success('Kont Plus Lotterie konekte!')
      onDone()
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <form className="pga-form" onSubmit={submit}>
      <div className="pga-tabs">
        <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Vin ajan</button>
        <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Mwen gen kont deja</button>
      </div>
      <p className="pga-muted">
        {mode === 'register'
          ? 'Chak kliyan ki kreye kont li sou lyen ou a epi ki jwe fich an liy fè w touche yon pousantaj. Bolèt la fikse pousantaj la e se li ki peye w.'
          : 'Konekte kont ajan Plus Lotterie ou a pou w wè l isit la.'}
      </p>
      {mode === 'login' ? (
        <label className="pga-field">Telefòn, imèl oswa kòd ajan lotri
          <input required value={f.identifier} onChange={set('identifier')} autoCapitalize="none" />
        </label>
      ) : (
        <>
          <label className="pga-field">Non konplè<input required maxLength={60} value={f.fullName} onChange={set('fullName')} /></label>
          <div className="pga-grid2">
            <label className="pga-field">WhatsApp<input required type="tel" value={f.phone} onChange={set('phone')} placeholder="3700-0000" /></label>
            <label className="pga-field">Vil<input required maxLength={60} value={f.city} onChange={set('city')} /></label>
          </div>
          <div className="pga-grid2">
            <label className="pga-field">NatCash (peman)<input type="tel" value={f.natcash} onChange={set('natcash')} placeholder="Menm ak WhatsApp" /></label>
            <label className="pga-field">Imèl<input type="email" value={f.email} onChange={set('email')} /></label>
          </div>
          <label className="pga-field">Ak ki bolèt ou vle travay?
            <select value={f.slug} onChange={set('slug')}>
              <option value="">Chwazi pita</option>
              {programs.map((p) => <option key={p.slug} value={p.slug}>{p.name} · {p.defaultRate}%</option>)}
            </select>
          </label>
        </>
      )}
      <label className="pga-field">{mode === 'login' ? 'Modpas' : 'Modpas pou kont lotri a'}
        <input required type="password" minLength={mode === 'register' ? 6 : 1} value={f.password} onChange={set('password')} />
      </label>
      {mode === 'register' && (
        <>
          <label className="pga-check"><input type="checkbox" checked={f.adult} onChange={set('adult')} />Mwen gen 18 an oswa plis.</label>
          <label className="pga-check"><input type="checkbox" checked={f.agree} onChange={set('agree')} />Mwen dakò: bolèt la apwouve m, li fikse pousantaj mwen e se li ki peye m.</label>
        </>
      )}
      {err && <p className="pga-err" role="alert">{err}</p>}
      <button type="submit" className="pga-btn pga-btn--red pga-btn--block" disabled={busy || (mode === 'register' && (!f.adult || !f.agree))}>
        {busy ? 'Tann…' : mode === 'login' ? 'Konekte kont lotri a' : 'Kreye kont Ajan Plus Lotterie'}
      </button>
    </form>
  )
}

export default function AgentDashboardPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('akey')
  const [showCreateTenant, setShowCreateTenant] = useState(false)
  const [lot, setLot]         = useState(null)      // done ajan lotri (si konekte)
  const [lotLinked, setLotLinked] = useState(() => !!getLotterySession()?.token)
  const [others, setOthers]   = useState([])
  const [sheet, setSheet]     = useState(null)      // { kind: 'connect'|'flyer'|'payout'|'pick', ... }
  const [flyerSrc, setFlyerSrc] = useState(null)
  const [amount, setAmount]   = useState('')
  const [busy, setBusy]       = useState(false)

  useEffect(() => {
    agentApi.get('/agents/dashboard')
      .then(res => setData(res.data))
      .catch(() => toast.error('Erè chajman done yo.'))
      .finally(() => setLoading(false))
  }, [])

  const loadLottery = useCallback(async () => {
    if (!getLotterySession()?.token) { setLotLinked(false); setLot(null); return }
    setLotLinked(true)
    try { setLot(await lotteryAgentApi.me()) } catch (e) { if (e.status === 401) { setLotLinked(false); setLot(null) } }
  }, [])
  useEffect(() => { loadLottery() }, [loadLottery])
  useEffect(() => { if (view === 'pwogram' && lotLinked) lotteryAgentApi.programs().then(setOthers).catch(() => setOthers([])) }, [view, lotLinked])

  const handleLogout = () => {
    clearAgent()
    lotteryAgentApi.logout()
    navigate('/agent')
    toast.success('Ou dekonekte.')
  }

  const copy = async (text, label = 'Kopye!') => {
    try { await navigator.clipboard.writeText(text); toast.success(label) } catch { toast(text) }
  }

  const agent = data?.agent
  const stockLink = agent ? `${APP_URL}/login?promo=${encodeURIComponent(agent.promoCode)}` : ''
  const lotApproved = useMemo(() => (lot?.programs || []).filter((p) => p.status === 'approved'), [lot])
  const lotLink = (p) => `${LOTTERY_SITE}${p.link}`

  // Grafik: 6 dènye mwa (stock + lotri)
  const chart = useMemo(() => {
    const now = new Date()
    const pts = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + k, 1)
      return { y: d.getFullYear(), m: d.getMonth(), l: MONTHS[d.getMonth()], v: 0 }
    })
    const add = (date, v) => {
      const d = new Date(date)
      const p = pts.find((x) => x.y === d.getFullYear() && x.m === d.getMonth())
      if (p) p.v += Number(v) || 0
    }
    ;(data?.commissions || []).forEach((c) => add(c.createdAt, c.amountHtg))
    ;(lot?.weeks || []).forEach((w) => add(`${w.start}T12:00:00`, w.amount))
    return pts
  }, [data, lot])

  if (loading) {
    return (
      <div className="pga" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.orangeLight}`, borderTop: `3px solid ${C.orange}`, borderRadius: '50%', animation: 'pgaspin 0.8s linear infinite' }} />
        <style>{'@keyframes pgaspin { to { transform: rotate(360deg) } }'}</style>
      </div>
    )
  }
  if (!data) return null

  const { tenants, commissions, stats, rank, totalAgents, message } = data
  const domains = Array.isArray(agent.domains) ? agent.domains : []
  const isSystem = domains.includes('system') || domains.includes('both')
  const isCommercial = domains.includes('commercial') || domains.includes('both')
  const lt = lot?.totals || { clients: 0, earned: 0, available: 0, pending: 0 }
  const totalClients = (stats.totalTenants || 0) + (lt.clients || 0)
  const totalEarned = (stats.totalEarned || 0) + (lt.earned || 0)
  const toCollect = (stats.totalPending || 0) + (lt.available || 0) + (lt.pending || 0)
  const firstName = agent.fullName.split(' ').slice(0, 2).join(' ')

  // Aksyon rapid: si ajan an gen lotri tou, li chwazi pwogram nan
  const choices = [
    { key: 'stock', label: 'Antrepriz (Stock / Komèsyal)', sub: `Kòd ${agent.promoCode}` },
    ...lotApproved.map((p) => ({ key: p.slug, label: `Plus Lotterie · ${p.name}`, sub: `${p.rate}%`, p })),
  ]
  function doAction(action, choice) {
    const isStock = choice.key === 'stock'
    const link = isStock ? stockLink : lotLink(choice.p)
    if (action === 'copy') copy(link, 'Lyen parenaj kopye!')
    if (action === 'wa') {
      const text = isStock
        ? `Jere biznis ou ak sistèm PlusGroup (stock, fakti, POS). Enskri ak kòd mwen ${agent.promoCode}: ${link}`
        : `Jwe bòlèt ${choice.p.name} an liy sou telefòn ou! Kreye kont ou isit la: ${link}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
    if (action === 'flyer') {
      setFlyerSrc(null)
      setSheet({ kind: 'flyer', title: isStock ? 'Flyer · PlusGroup' : `Flyer · ${choice.p.name}` })
      makeFlyer(isStock
        ? { title: 'PLUS GROUP', subtitle: 'Sistèm jesyon pou biznis ou', link, code: agent.promoCode, footer: 'Inovasyon • Konfyans • Rezilta' }
        : { title: choice.p.name, subtitle: 'Jwe bòlèt ou an liy · Depo NatCash', link, code: lot.agent.code, footer: '18 an oswa plis · Jwe ak responsablite' })
        .then(setFlyerSrc).catch(() => { toast.error('Pa ka kreye flyer la.'); setSheet(null) })
    }
    if (action === 'payout') {
      if (isStock) {
        const msg = `Bonjou Plus Group, mwen se ajan ${agent.fullName} (${agent.promoCode}). Mwen ta renmen touche komisyon an atant mwen yo: ${htg(stats.totalPending)}.`
        window.open(`https://wa.me/${PLUS_WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
      } else {
        setAmount(choice.p.available >= choice.p.minPayout ? String(Math.floor(choice.p.available)) : '')
        setSheet({ kind: 'payout', p: choice.p })
      }
    }
  }
  function quick(action) {
    if (choices.length === 1) doAction(action, choices[0])
    else setSheet({ kind: 'pick', action })
  }
  async function sendPayout(e) {
    e.preventDefault()
    setBusy(true)
    try { const r = await lotteryAgentApi.payout(sheet.p.slug, Number(amount)); toast.success(r.message || 'Demann voye'); setSheet(null); loadLottery() }
    catch (e2) { toast.error(e2.message) } finally { setBusy(false) }
  }
  async function join(slug) {
    try { const r = await lotteryAgentApi.join(slug); toast.success(r.message); loadLottery() } catch (e) { toast.error(e.message) }
  }

  const Head = ({ icon: Icon, title, action }) => (
    <div className="pga-card__head"><span><Icon size={19} /></span><h3>{title}</h3>{action}</div>
  )
  const NAV = [['akey', Home, 'Akèy'], ['kliyan', Users, 'Kliyan mwen'], ['komisyon', Coins, 'Komisyon'], ['pwogram', Layers, 'Pwogram'], ['pwofil', User, 'Pwofil']]
  const go = (v) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="pga">
      <header className="pga-top">
        <div className="pga-top__in">
          <button type="button" className="pga-brand" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left' }} onClick={() => go('akey')}>
            <img src={LOGO_URL} alt="Plus Group" />
            <b>PLUS <span>GROUP</span></b>
            <i>Espas Ajan</i>
          </button>
          <button type="button" className="pga-ic" aria-label="Komisyon" onClick={() => go('komisyon')}>
            <Bell size={22} />{toCollect > 0 && <span className="dot" aria-hidden="true" />}
          </button>
          <button type="button" className="pga-ic pga-ic--ring" aria-label="Pwofil" onClick={() => go('pwofil')}><User size={22} /></button>
        </div>
      </header>

      <div className="pga-wrap">
        {view === 'akey' && (
          <>
            <Promo />
            <section className="pga-hello">
              <div className="pga-me">
                <span className="pga-av" aria-hidden="true">{agent.fullName.slice(0, 1).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <small>Bonjou,</small>
                  <strong>{firstName}</strong>
                  <span className="pga-badge"><Crown size={13} /> Ajan PlusGroup</span>
                </div>
              </div>
              <div className="pga-kpis">
                <div className="pga-kpi"><Users size={22} /><span style={{ minWidth: 0 }}><small>Kliyan mennen</small><b>{nf.format(totalClients)}</b></span></div>
                <div className="pga-kpi pga-kpi--gold"><Coins size={22} /><span style={{ minWidth: 0 }}><small>Komisyon (HTG)</small><b>{short(totalEarned)}</b></span></div>
              </div>
            </section>

            <div className="pga-sec"><Layers size={24} /><h2>Pwogram Ajan mwen yo</h2></div>
            <div className="pga-progs">
              <button type="button" className={`pga-prog pga-prog--blue ${isCommercial ? 'on' : ''}`} onClick={() => go('pwogram')}>
                <span className="go"><ArrowRight size={14} /></span><ShoppingCart size={28} />Ajan Komèsyal
                <small>{isCommercial ? (agent.commercialCommissionRate != null ? `${agent.commercialCommissionRate}%` : 'Pousantaj poko fikse') : 'Pa aktif'}</small>
              </button>
              <button type="button" className={`pga-prog pga-prog--green ${isSystem ? 'on' : ''}`} onClick={() => go('kliyan')}>
                <span className="go"><ArrowRight size={14} /></span><Package size={28} />Ajan Gestion Stock
                <small>{stats.activeTenants}/{stats.totalTenants} antrepriz</small>
              </button>
              <button type="button" className={`pga-prog pga-prog--red ${lotApproved.length ? 'on' : ''}`} onClick={() => (lotLinked ? go('pwogram') : setSheet({ kind: 'connect' }))}>
                <span className="go"><ArrowRight size={14} /></span>
                <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">🎱</span>Ajan Plus Lotterie
                <small>{!lotLinked ? 'Aktive l' : lotApproved.length ? `${lotApproved.length} bolèt` : 'Chwazi yon bolèt'}</small>
              </button>
            </div>

            <section className="pga-card">
              <Head icon={BarChart3} title="Apèsi komisyon mwen" />
              <div className="pga-chartwrap">
                <Chart points={chart} />
                <div className="pga-mini">
                  <div><Wallet size={26} color="#1f5cff" /><span style={{ minWidth: 0 }}><small>Total touche</small><b>{htg(totalEarned)}</b></span></div>
                  <div><CheckCircle2 size={26} color="#16a34a" /><span style={{ minWidth: 0 }}><small>Pou touche</small><b>{htg(toCollect)}</b></span></div>
                </div>
              </div>
            </section>

            <section className="pga-card">
              <Head icon={Zap} title="Aksyon rapid" />
              <div className="pga-actions">
                <button type="button" className="pga-action" onClick={() => quick('copy')}><Link2 size={28} color="#1f5cff" />Lyen parenaj mwen</button>
                <button type="button" className="pga-action" onClick={() => quick('wa')}>
                  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="#16a34a" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm4.4 11.7c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z" /></svg>
                  Pataje sou WhatsApp
                </button>
                <button type="button" className="pga-action" onClick={() => quick('flyer')}><ImageIcon size={28} color="#e11d2e" />Flyer pwomosyon</button>
                <button type="button" className="pga-action" onClick={() => quick('payout')}><Wallet size={28} color="#1f5cff" />Mande yon retrè</button>
              </div>
            </section>

            <section className="pga-card">
              <div className="pga-code">
                <span style={{ minWidth: 0 }}><small style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, color: C.orangeDark, textTransform: 'uppercase' }}>Kòd pwomo ou</small><b>{agent.promoCode}</b></span>
                <button type="button" className="pga-btn pga-btn--orange" onClick={() => copy(agent.promoCode, 'Kòd pwomo kopye!')}><Copy size={15} /> Kopye</button>
              </div>
              {message && <p className="pga-note pga-note--green" style={{ marginTop: 10, marginBottom: 0 }}>💪 {message}</p>}
              <div className="pga-row" style={{ marginTop: 10 }}>
                <button type="button" className="pga-btn pga-btn--orange" onClick={() => setShowCreateTenant(true)}><Plus size={15} /> Kreye Antrepriz</button>
              </div>
            </section>
          </>
        )}

        {view === 'kliyan' && (
          <>
            <section className="pga-card">
              <Head icon={Package} title={`Antrepriz ou mennen (${tenants.length})`}
                action={<button type="button" className="pga-btn pga-btn--orange" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => setShowCreateTenant(true)}><Plus size={14} /> Kreye</button>} />
              {tenants.length === 0 ? <p className="pga-muted">Ou poko mennen okenn antrepriz. Pataje kòd ou a!</p> : (
                <ul className="pga-list">
                  {tenants.map((t) => (
                    <li key={t.id}>
                      <span className="pga-li"><b>{t.name}</b><small>depi {dateFr(t.createdAt)}</small></span>
                      <span className={`pga-pill ${t.status === 'active' ? 'ok' : 'no'}`}>{t.status === 'active' ? 'Aktif' : t.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="pga-card">
              <Head icon={Users} title={`Kliyan Plus Lotterie (${lt.clients || 0})`} />
              {!lotLinked ? (
                <button type="button" className="pga-btn pga-btn--red" onClick={() => setSheet({ kind: 'connect' })}>Aktive Ajan Plus Lotterie</button>
              ) : (
                <>
                  <ul className="pga-list">
                    {(lot?.programs || []).filter((p) => p.status === 'approved').map((p) => (
                      <li key={p.slug}><span className="pga-li"><b>{p.name}</b><small>{p.clients} kliyan · vant {htg(p.sales)}</small></span><b style={{ color: '#0b8a3a' }}>+{nf.format(p.earned)}</b></li>
                    ))}
                  </ul>
                  <a className="pga-btn pga-btn--ghost" style={{ marginTop: 10 }} href={lotteryAgentApi.spaceUrl()} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Wè lis kliyan yo an detay</a>
                </>
              )}
            </section>
          </>
        )}

        {view === 'komisyon' && (
          <>
            <section className="pga-card">
              <Head icon={TrendingUp} title="Rezime" />
              <div className="pga-stats4">
                <div><small>Total touche</small><b>{short(totalEarned)}</b></div>
                <div><small>Deja peye</small><b>{short((stats.totalPaid || 0) + (lt.paid || 0))}</b></div>
                <div><small>Pou touche</small><b>{short(toCollect)}</b></div>
                <div><small>Antrepriz aktif</small><b>{stats.activeTenants}/{stats.totalTenants}</b></div>
              </div>
            </section>
            <section className="pga-card">
              <Head icon={Package} title="Komisyon antrepriz (Stock)" />
              {stats.totalPending > 0 && (
                <button type="button" className="pga-btn pga-btn--orange" style={{ marginBottom: 10 }} onClick={() => doAction('payout', choices[0])}><Wallet size={15} /> Mande peman ({htg(stats.totalPending)})</button>
              )}
              {commissions.length === 0 ? <p className="pga-muted">Pa gen komisyon ankò.</p> : (
                <ul className="pga-list">
                  {commissions.map((c) => (
                    <li key={c.id}>
                      <span className="pga-li"><b>{c.tenant?.name}</b><small>{c.months} mwa · {dateFr(c.createdAt)}</small></span>
                      <span className="pga-li" style={{ alignItems: 'flex-end' }}><b>{htg(c.amountHtg)}</b><span className={`pga-pill ${c.status === 'paid' ? 'ok' : 'wait'}`}>{c.status === 'paid' ? 'Peye' : 'An atant'}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="pga-card">
              <Head icon={Coins} title="Komisyon Plus Lotterie" />
              {!lotLinked ? <button type="button" className="pga-btn pga-btn--red" onClick={() => setSheet({ kind: 'connect' })}>Aktive Ajan Plus Lotterie</button> : (
                <>
                  {!lotApproved.length && <p className="pga-muted">Okenn bolèt poko apwouve w.</p>}
                  <ul className="pga-list">
                    {lotApproved.map((p) => (
                      <li key={p.slug}>
                        <span className="pga-li"><b>{p.name}</b><small>{p.rate}% · disponib {htg(p.available)}{p.pending ? ` · ${htg(p.pending)} ap tann` : ''}</small></span>
                        <button type="button" className="pga-btn pga-btn--orange" style={{ minHeight: 36, padding: '0 12px' }} disabled={p.available < Math.max(1, p.minPayout)}
                          onClick={() => doAction('payout', { key: p.slug, p })}>Retire</button>
                      </li>
                    ))}
                  </ul>
                  {(lot?.payouts || []).length > 0 && (
                    <ul className="pga-list" style={{ marginTop: 10 }}>
                      {lot.payouts.slice(0, 10).map((p) => (
                        <li key={p.id}>
                          <span className="pga-li"><b>Retrè · {p.tenant}</b><small>{dateFr(p.createdAt)}{p.reference ? ` · ID ${p.reference}` : ''}</small></span>
                          <span className="pga-li" style={{ alignItems: 'flex-end' }}><b>{htg(p.amount)}</b><span className={`pga-pill ${p.status === 'paid' ? 'ok' : p.status === 'pending' ? 'wait' : 'no'}`}>{p.status === 'paid' ? 'Peye' : p.status === 'pending' ? 'Ap tann' : 'Refize'}</span></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {view === 'pwogram' && (
          <>
            <section className="pga-card">
              <Head icon={ShoppingCart} title="Ajan Komèsyal" />
              {isCommercial ? (
                agent.commercialCommissionRate != null
                  ? <p className="pga-muted">Ou touche <b style={{ color: C.blue, fontSize: '1.1rem' }}>{agent.commercialCommissionRate}%</b> sou chak acha pwodui kliyan ou yo fè.</p>
                  : <p className="pga-muted">Ekip Plus Group poko defini pousantaj komisyon ou. Y ap kontakte w byento.</p>
              ) : <p className="pga-muted">Ou pa enskri nan domèn sa a. Kontakte Plus Group si w vle aktive l.</p>}
            </section>
            <section className="pga-card">
              <Head icon={Package} title="Ajan Gestion Stock (Sistèm)" />
              {isSystem ? (
                <>
                  <p className="pga-note pga-note--orange"><Trophy size={14} style={{ verticalAlign: '-2px' }} /> Ou nan pozisyon <b>#{rank || '—'}</b>{totalAgents > 0 ? ` sou ${totalAgents} ajan` : ''}. Konkou fen ane: 100,000 HTG bay 3 pi gwo Ajan Sistèm yo — objektif 20+ antrepriz.</p>
                  <div className="pga-link"><Link2 size={15} /><span>{stockLink}</span></div>
                  <div className="pga-row" style={{ marginTop: 10 }}>
                    <button type="button" className="pga-btn pga-btn--ghost" onClick={() => copy(stockLink, 'Lyen kopye!')}><Copy size={15} /> Kopye lyen an</button>
                    <button type="button" className="pga-btn pga-btn--orange" onClick={() => setShowCreateTenant(true)}><Plus size={15} /> Kreye Antrepriz</button>
                  </div>
                </>
              ) : <p className="pga-muted">Ou pa enskri nan domèn sa a. Kontakte Plus Group si w vle aktive l.</p>}
            </section>
            <section className="pga-card">
              <Head icon={Coins} title="Ajan Plus Lotterie"
                action={lotLinked && <a className="pga-btn pga-btn--ghost" style={{ minHeight: 34, padding: '0 10px', fontSize: '.8rem' }} href={lotteryAgentApi.spaceUrl()} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Ouvri</a>} />
              {!lotLinked ? (
                <>
                  <p className="pga-muted" style={{ marginBottom: 10 }}>Pataje lyen pa w pou kliyan yo jwe bòlèt an liy: ou touche yon pousantaj sou chak fich yo jwe. Se bolèt la ki fikse l epi ki peye w.</p>
                  <button type="button" className="pga-btn pga-btn--red" onClick={() => setSheet({ kind: 'connect' })}>Aktive Ajan Plus Lotterie</button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!(lot?.programs || []).length && <p className="pga-muted">Ou poko mande travay ak okenn bolèt. Chwazi youn anba a.</p>}
                  {(lot?.programs || []).map((p) => (
                    <div key={p.slug} className="pga-lot">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span className="pga-li"><b>{p.name}</b><small>{p.status === 'approved' ? `${p.rate}% sou vant kliyan ou yo` : p.status === 'pending' ? 'Bolèt la ap revize demann ou an' : 'Pa aktif'}</small></span>
                        <span className={`pga-pill ${p.status === 'approved' ? 'ok' : p.status === 'pending' ? 'wait' : 'no'}`}>{p.status === 'approved' ? 'Apwouve' : p.status === 'pending' ? 'Ap tann' : 'Refize'}</span>
                      </div>
                      {p.status === 'approved' && (
                        <>
                          <div className="pga-stats4">
                            <div><small>Kliyan</small><b>{p.clients}</b></div>
                            <div><small>Vant</small><b>{short(p.sales)}</b></div>
                            <div><small>Touche</small><b>{short(p.earned)}</b></div>
                            <div><small>Disponib</small><b>{short(p.available)}</b></div>
                          </div>
                          <div className="pga-link"><Link2 size={15} /><span>{lotLink(p)}</span></div>
                          <div className="pga-row">
                            <button type="button" className="pga-btn pga-btn--ghost" onClick={() => copy(lotLink(p), 'Lyen kopye!')}><Copy size={15} /> Kopye</button>
                            <button type="button" className="pga-btn pga-btn--red" onClick={() => doAction('wa', { key: p.slug, p })}>WhatsApp</button>
                            <button type="button" className="pga-btn pga-btn--ghost" onClick={() => doAction('flyer', { key: p.slug, p })}><ImageIcon size={15} /> Flyer</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {others.filter((o) => !(lot?.programs || []).some((p) => p.slug === o.slug)).length > 0 && (
                    <ul className="pga-list">
                      {others.filter((o) => !(lot?.programs || []).some((p) => p.slug === o.slug)).map((o) => (
                        <li key={o.slug}>
                          <span className="pga-li"><b>{o.name}</b><small>{o.defaultRate}% pa defo{o.terms ? ` · ${o.terms}` : ''}</small></span>
                          <button type="button" className="pga-btn pga-btn--red" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => join(o.slug)}>Mande</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {view === 'pwofil' && (
          <section className="pga-card">
            <Head icon={User} title="Pwofil mwen" />
            <ul className="pga-list">
              <li><span className="pga-li"><small>Non</small><b>{agent.fullName}</b></span></li>
              <li><span className="pga-li"><small>Kòd pwomo</small><b>{agent.promoCode}</b></span></li>
              {agent.email && <li><span className="pga-li"><small>Imèl</small><b>{agent.email}</b></span></li>}
              {agent.phone && <li><span className="pga-li"><small>Telefòn</small><b>{agent.phone}</b></span></li>}
              {agent.city && <li><span className="pga-li"><small>Vil</small><b>{agent.city}</b></span></li>}
              <li>
                <span className="pga-li"><small>Plus Lotterie</small><b>{lotLinked ? `Konekte${lot?.agent?.code ? ` · ${lot.agent.code}` : ''}` : 'Pa konekte'}</b></span>
                {lotLinked
                  ? <button type="button" className="pga-btn pga-btn--ghost" style={{ minHeight: 34, padding: '0 10px', fontSize: '.8rem' }} onClick={() => { lotteryAgentApi.logout(); setLot(null); setLotLinked(false) }}>Dekonekte</button>
                  : <button type="button" className="pga-btn pga-btn--red" style={{ minHeight: 34, padding: '0 10px', fontSize: '.8rem' }} onClick={() => setSheet({ kind: 'connect' })}>Aktive</button>}
              </li>
            </ul>
            <button type="button" className="pga-btn pga-btn--ghost pga-btn--block" style={{ marginTop: 12 }} onClick={handleLogout}><LogOut size={16} /> Dekonekte</button>
          </section>
        )}
      </div>

      <nav className="pga-nav" aria-label="Navigasyon ajan">
        {NAV.map(([k, Icon, label]) => (
          <button key={k} type="button" className={view === k ? 'on' : ''} aria-current={view === k ? 'page' : undefined} onClick={() => go(k)}>
            <Icon size={22} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {sheet?.kind === 'connect' && (
        <Sheet title="Ajan Plus Lotterie" onClose={() => setSheet(null)}>
          <LotteryConnect agent={agent} onDone={() => { setSheet(null); loadLottery(); go('pwogram') }} />
        </Sheet>
      )}
      {sheet?.kind === 'pick' && (
        <Sheet title="Pou ki pwogram?" onClose={() => setSheet(null)}>
          <ul className="pga-list">
            {choices.map((c) => (
              <li key={c.key}>
                <span className="pga-li"><b>{c.label}</b><small>{c.sub}</small></span>
                <button type="button" className="pga-btn pga-btn--orange" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => { const a = sheet.action; setSheet(null); doAction(a, c) }}>Chwazi</button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {sheet?.kind === 'flyer' && (
        <Sheet title={sheet.title} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {flyerSrc ? <img src={flyerSrc} alt="Flyer ak QR kòd" style={{ width: 'min(100%, 300px)', borderRadius: 14, boxShadow: '0 6px 18px rgba(0,0,0,.25)' }} /> : <p className="pga-muted">Ap prepare flyer la…</p>}
            {flyerSrc && <a className="pga-btn pga-btn--orange pga-btn--block" href={flyerSrc} download="flyer-ajan.png">Telechaje imaj la</a>}
          </div>
        </Sheet>
      )}
      {sheet?.kind === 'payout' && (
        <Sheet title={`Retrè · ${sheet.p.name}`} onClose={() => setSheet(null)}>
          <form className="pga-form" onSubmit={sendPayout}>
            <p className="pga-muted">Disponib: <b>{htg(sheet.p.available)}</b> · Minimòm: {htg(sheet.p.minPayout)}. Bolèt la ap voye kòb la sou NatCash ou.</p>
            <label className="pga-field">Montan (HTG)<input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></label>
            <button type="submit" className="pga-btn pga-btn--orange pga-btn--block" disabled={busy}>{busy ? 'Tann…' : 'Voye demann lan'}</button>
          </form>
        </Sheet>
      )}

      {showCreateTenant && (
        <CreateTenantModal agent={agent} onClose={() => setShowCreateTenant(false)} />
      )}
    </div>
  )
}

/* ─── MODAL KREYE ANTREPRIZ (pou kliyan ajan an mennen) ─── */
function CreateTenantModal({ agent, onClose }) {
  const [form, setForm] = useState({
    name: '', slug: '', email: '', phone: '', address: '',
    adminName: '', adminEmail: '', adminPassword: '', planId: null, monthlyPrice: '',
  })
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    agentApi.get('/public/plans').then(res => {
      const list = res.data.plans || []
      setPlans(list)
      if (list.length) set('planId', list[0].id)
    }).catch(() => toast.error('Pa t ka chaje lis plan yo.'))
  }, [])

  const suggestSlug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Non antrepriz la obligatwa.')
    if (!form.adminEmail.trim() || !form.adminPassword.trim()) return toast.error('Imèl ak modpas administratè a obligatwa.')
    if (form.adminPassword.length < 6) return toast.error('Modpas la dwe gen omwen 6 karaktè.')
    if (!form.planId) return toast.error('Chwazi yon plan.')
    const selectedPlan = plans.find(p => p.id === form.planId)
    const rule = PLAN_PRICE_RULES[selectedPlan?.name] || { min: 2500, max: null }
    const priceNum = Number(form.monthlyPrice)
    if (!priceNum || priceNum < rule.min || (rule.max && priceNum > rule.max)) {
      const rangeMsg = rule.max ? `ant ${rule.min} ak ${rule.max} HTG` : `omwen ${rule.min} HTG`
      return toast.error(`Pou plan "${selectedPlan?.name}", montan an dwe ${rangeMsg}.`)
    }

    setSaving(true)
    try {
      const res = await agentApi.post('/agents/tenant-requests', {
        ...form,
        monthlyPrice: Number(form.monthlyPrice),
        slug: form.slug.trim() || suggestSlug(form.name),
      })
      toast.success(res.data.message || 'Demann voye avèk siksè!')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erè kreye antrepriz la.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
    background: C.white, border: `1.5px solid ${C.border}`, color: C.navy, fontSize: 13, outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: C.white, borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.navy }}>Kreye Antrepriz</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMuted }}>Ou gen yon mwa pou itilize sistèm nan. Apre yon mwa itilizasyon, kliyan an dwe peye pou kontinye.</p>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', color: C.textMuted }}><X size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#FFF7ED', border: `1px solid ${C.orangeLight}`, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>KÒD PWOMO OU</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: C.orangeDark, fontSize: 13 }}>{agent.promoCode}</span>
          </div>

          <div>
            <label style={labelStyle}>NON ANTREPRIZ *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Boutik Marie" />
          </div>
          <div>
            <label style={labelStyle}>SLUG (adrès kout)</label>
            <input value={form.slug} onChange={e => set('slug', e.target.value)} style={inputStyle}
              placeholder={form.name ? suggestSlug(form.name) : 'boutik-marie'} />
          </div>
          <div>
            <label style={labelStyle}>IMÈL ANTREPRIZ</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="kontak@antrepriz.com" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>TELEFÒN</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="+509 XXXX XXXX" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ADRÈS</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle} placeholder="Vil, Depatman" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>CHWAZI YON PLAN *</label>
            {plans.length === 0 ? (
              <p style={{ color: C.textMuted, fontSize: 12 }}>Ap chaje plan yo...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {plans.map(p => {
                  const active = p.id === form.planId
                  return (
                    <button key={p.id} type="button" onClick={() => set('planId', p.id)} style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: active ? `1.5px solid ${C.orange}` : `1.5px solid ${C.border}`,
                      background: active ? '#FFF7ED' : C.white,
                    }}>
                      <div style={{ color: active ? C.orangeDark : C.navy, fontWeight: 800, fontSize: 13 }}>{p.name}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {(() => {
            const selectedPlan = plans.find(p => p.id === form.planId)
            const rule = PLAN_PRICE_RULES[selectedPlan?.name] || { min: 2500, max: null }
            const rangeText = rule.max ? `ant ${rule.min.toLocaleString()} ak ${rule.max.toLocaleString()} HTG` : `omwen ${rule.min.toLocaleString()} HTG`
            return (
              <div>
                <label style={labelStyle}>MONTAN MANSYÈL (HTG) *</label>
                <input type="number" min={rule.min} max={rule.max || undefined} value={form.monthlyPrice} onChange={e => set('monthlyPrice', e.target.value)} style={inputStyle} placeholder={`Egzanp: ${rule.min}`} />
                <p style={{ color: C.textMuted, fontSize: 10.5, margin: '4px 0 0' }}>Pou plan "{selectedPlan?.name || '...'}" — {rangeText}</p>
              </div>
            )
          })()}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kont Administratè Kliyan An</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>NON ADMINISTRATÈ</label>
                <input value={form.adminName} onChange={e => set('adminName', e.target.value)} style={inputStyle} placeholder="Marie Jean" />
              </div>
              <div>
                <label style={labelStyle}>IMÈL KONEKSYON *</label>
                <input value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} style={inputStyle} placeholder="marie@antrepriz.com" />
              </div>
              <div>
                <label style={labelStyle}>MODPAS *</label>
                <input type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} style={inputStyle} placeholder="Omwen 6 karaktè" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Anile</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
            {saving ? 'Ap voye...' : 'Kreye Antrepriz'}
          </button>
        </div>
      </div>
    </div>
  )
}
