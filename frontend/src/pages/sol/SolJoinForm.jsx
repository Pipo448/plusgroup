// src/pages/sol/SolJoinForm.jsx
// ─── Fòm "Mwen vle antre nan sòl la" (modal) — louvri depi paj login lan ───
// Kesyon yo (apa non, telefòn, adrès) vini de backend (admin modifye yo nan AdminDashboard).
// Si pa gen anyen ki sove oswa rezo a tonbe, nou itilize kesyon default yo (solJoinConfig.js).
// Pa gen nouvo wout: se yon fenèt sou paj /app/sol/login.
// Voye done yo sou POST /api/sol/join-requests (piblik, rate-limit + honeypot).

import { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react'
import {
  X, ArrowLeft, ArrowRight, Check, User, History, Wallet, HeartHandshake, MessageCircle, Send, Plus, Minus, Sparkles, Users,
} from 'lucide-react'
import { DEFAULT_CONFIG, normalizeConfig, isVisible } from './solJoinConfig'

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
const SUPPORT_NUMBER = '50942449024'
const DRAFT_KEY = 'sol_join_draft_v2'
const OTHER = '__other__'
const STEP_ICONS = [User, History, Wallet, HeartHandshake, Users, Sparkles]

const FIXED0 = { fullName: '', phone: '', address: '', acceptRules: false, acceptContact: false, website: '' }
const fmtN = (n) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const isNumOpt = (q) => q.options.length > 0 && q.options.every(o => /^\d+$/.test(o))

// ── ti konpozan (deyò fonksyon prensipal la pou input yo pa pèdi fokis chak fwa ou tape) ──
const FormCtx = createContext({ f: FIXED0, set: () => {}, errs: {}, ans: {}, setAns: () => {}, other: {}, setOther: () => {} })

function Err({ k }) {
  const { errs } = useContext(FormCtx)
  return errs[k] ? <p className="sj-err" role="alert">{errs[k]}</p> : null
}
function Text({ k, label, ph, type = 'text', req, auto, inputMode }) {
  const { f, set, errs } = useContext(FormCtx)
  return (
    <div className="sj-f">
      <label htmlFor={`sj-${k}`}>{label}{req && <b> *</b>}</label>
      <input id={`sj-${k}`} type={type} value={f[k]} placeholder={ph} autoComplete={auto} inputMode={inputMode}
        className={errs[k] ? 'bad' : ''} onChange={e => set(k, e.target.value)} />
      <Err k={k} />
    </div>
  )
}
function YesNoBtns({ value, onChange, yes = 'Wi', no = 'Non' }) {
  return (
    <div className="sj-yn" role="radiogroup">
      <button type="button" role="radio" aria-checked={value === true}  className={value === true ? 'on' : ''}  onClick={() => onChange(true)}><Check size={16} strokeWidth={3} /> {yes}</button>
      <button type="button" role="radio" aria-checked={value === false} className={value === false ? 'on no' : ''} onClick={() => onChange(false)}><X size={16} strokeWidth={3} /> {no}</button>
    </div>
  )
}

// Yon kesyon dinamik (selon tip li)
function Question({ q }) {
  const { ans, setAns, other, setOther, errs } = useContext(FormCtx)
  const v = ans[q.id]
  const star = q.required ? <b style={{ color: '#FF6A00' }}> *</b> : null
  const bad = errs[q.id]
  if (q.type === 'text') {
    return (
      <div className="sj-f">
        <label htmlFor={`sj-${q.id}`}>{q.label}{star}</label>
        <input id={`sj-${q.id}`} className={bad ? 'bad' : ''} value={v ?? ''} placeholder={q.placeholder} maxLength={300} onChange={e => setAns(q.id, e.target.value)} />
        <Err k={q.id} />
      </div>
    )
  }
  if (q.type === 'textarea') {
    return (
      <div className="sj-f">
        <label htmlFor={`sj-${q.id}`}>{q.label}{star}</label>
        <textarea id={`sj-${q.id}`} rows={3} value={v ?? ''} placeholder={q.placeholder} maxLength={1200} onChange={e => setAns(q.id, e.target.value)} />
        <Err k={q.id} />
      </div>
    )
  }
  if (q.type === 'yesno') {
    return (
      <div className="sj-f">
        <span className="sj-q">{q.label}{star}</span>
        <YesNoBtns value={v} onChange={(x) => setAns(q.id, x)} yes={q.yesLabel || 'Wi'} no={q.noLabel || 'Non'} />
        <Err k={q.id} />
      </div>
    )
  }
  if (q.type === 'choice') {
    const numeric = isNumOpt(q)
    return (
      <div className="sj-f">
        <span className="sj-q">{q.label}{star}</span>
        <div className="sj-chips">
          {q.options.map(o => (
            <button type="button" key={o} className={`${q.gold ? 'gold ' : ''}${v === o ? 'on' : ''}`} onClick={() => setAns(q.id, o)}>{numeric ? fmtN(o) : o}</button>
          ))}
          {q.allowOther && <button type="button" className={`${q.gold ? 'gold ' : ''}${v === OTHER ? 'on' : ''}`} onClick={() => setAns(q.id, OTHER)}>Lòt</button>}
        </div>
        {v === OTHER && (
          <input className={bad ? 'bad' : ''} value={other[q.id] || ''} placeholder={numeric ? 'Montan ou ka mete' : 'Di nou…'} inputMode={numeric ? 'numeric' : undefined}
            onChange={e => setOther(q.id, e.target.value.slice(0, 80))} />
        )}
        <Err k={q.id} />
      </div>
    )
  }
  if (q.type === 'stepper') {
    const n = Number.isFinite(Number(v)) && v !== undefined ? Number(v) : q.min
    return (
      <div className="sj-f">
        <span className="sj-q">{q.label}{star}</span>
        <div className="sj-step">
          <button type="button" aria-label="Mwens" onClick={() => setAns(q.id, Math.max(q.min, n - 1))}><Minus size={18} /></button>
          <strong>{n}</strong>
          <button type="button" aria-label="Plis" onClick={() => setAns(q.id, Math.min(q.max, n + 1))}><Plus size={18} /></button>
        </div>
      </div>
    )
  }
  return null
}

// Gwoupe kesyon kondisyonèl ki swiv youn lòt (menm paran) nan yon sèl bwat
function renderQuestions(list) {
  const out = []
  let box = null
  list.forEach(q => {
    if (q.showIf) {
      const key = `${q.showIf.id}:${String(q.showIf.value)}`
      if (box && box.key === key) box.items.push(q)
      else { box = { key, items: [q] }; out.push(box) }
    } else { box = null; out.push(q) }
  })
  return out.map(x => x.items
    ? <div className="sj-sub" key={`sub-${x.key}-${x.items[0].id}`}>{x.items.map(q => <Question key={q.id} q={q} />)}</div>
    : <Question key={x.id} q={x} />)
}

export default function SolJoinForm({ onClose }) {
  const [cfg, setCfg]         = useState(() => normalizeConfig(DEFAULT_CONFIG))
  const [step, setStep]       = useState(0)
  const [f, setF]             = useState(FIXED0)
  const [ans, setAnsAll]      = useState({})
  const [other, setOtherAll]  = useState({})
  const [errs, setErrs]       = useState({})
  const [sending, setSending] = useState(false)
  const [netErr, setNetErr]   = useState('')
  const [done, setDone]       = useState(null)   // { duplicate }
  const sheetRef = useRef(null)

  // Kesyon yo soti nan backend (admin modifye yo). Si l echwe → default yo rete.
  useEffect(() => {
    let off = false
    const ctl = new AbortController()
    fetch(`${SOL_API}/api/sol/join-config`, { signal: ctl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!off && d?.config) setCfg(normalizeConfig(d.config)) })
      .catch(() => {})
    return () => { off = true; ctl.abort() }
  }, [])

  // Brouyon (pa pèdi done si paj la rechaje)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        setF(p => ({ ...p, ...d.f, website: '' })); setAnsAll(d.ans || {}); setOtherAll(d.other || {})
        if (Number.isInteger(d.step)) setStep(Math.max(0, d.step))
      }
    } catch { /* */ }
  }, [])
  useEffect(() => {
    if (done) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ f: { ...f, website: '' }, ans, other, step })) } catch { /* */ }
  }, [f, ans, other, step, done])

  // Bloke defilman paj la dèyè + ESC
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const set      = useCallback((k, v) => { setF(p => ({ ...p, [k]: v })); setErrs(p => (p[k] ? { ...p, [k]: '' } : p)) }, [])
  const setAns   = useCallback((k, v) => { setAnsAll(p => ({ ...p, [k]: v })); setErrs(p => (p[k] ? { ...p, [k]: '' } : p)) }, [])
  const setOther = useCallback((k, v) => { setOtherAll(p => ({ ...p, [k]: v })); setErrs(p => (p[k] ? { ...p, [k]: '' } : p)) }, [])

  // Etap yo: gwoup ki gen omwen yon kesyon vizib (premye ak dènye etap toujou la: gen chan fiks yo)
  const steps = useMemo(() => {
    const active = cfg.groups.map(g => ({ ...g, qs: cfg.questions.filter(q => q.group === g.id && isVisible(q, ans)) }))
    const withQ = active.filter(g => g.qs.length)
    const list = withQ.length ? withQ : [{ ...cfg.groups[0], qs: [] }]
    return list
  }, [cfg, ans])
  const last = steps.length - 1
  const stepIdx = Math.min(step, last)
  const S = steps[stepIdx]
  const Icon = STEP_ICONS[stepIdx % STEP_ICONS.length]

  useEffect(() => { sheetRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }) }, [stepIdx, done])

  const validate = (idx) => {
    const e = {}
    if (idx === 0) {
      if (f.fullName.trim().split(/\s+/).filter(Boolean).length < 2) e.fullName = 'Antre non ak prenon ou.'
      const d = f.phone.replace(/\D/g, '')
      if (d.length < 8 || d.length > 15) e.phone = 'Nimewo telefòn lan pa valid.'
      if (f.address.trim().length < 4) e.address = 'Antre vil/komin ak katye ou.'
    }
    steps[idx].qs.forEach(q => {
      if (!q.required) return
      const v = ans[q.id]
      if (q.type === 'stepper') return
      if (v === undefined || v === null || String(v).trim() === '') e[q.id] = 'Chwazi oswa ekri yon repons.'
      else if (v === OTHER && !(other[q.id] || '').trim()) e[q.id] = 'Ekri repons ou nan chan an.'
    })
    if (idx === last) {
      if (!f.acceptRules) e.acceptRules = 'Ou dwe aksepte regleman an.'
      if (!f.acceptContact) e.acceptContact = 'Nou bezwen pèmisyon w pou kontakte w.'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validate(stepIdx)) setStep(stepIdx + 1) }
  const back = () => { setErrs({}); setStep(Math.max(0, stepIdx - 1)) }

  // Repons final yo (sèlman kesyon vizib yo)
  const answerList = () => {
    const out = []
    steps.forEach(g => g.qs.forEach(q => {
      let v = ans[q.id]
      if (q.type === 'stepper') v = Number.isFinite(Number(v)) && v !== undefined ? Number(v) : q.min
      if (v === OTHER) v = (other[q.id] || '').trim() || 'Lòt'
      if (v === undefined || v === null || String(v).trim() === '') return
      out.push({ id: q.id, label: q.label, value: v })
    }))
    return out
  }

  const summary = () => {
    const lines = ['Bonjou, mwen vle antre nan sòl la.', `Non: ${f.fullName}`, `Telefòn: ${f.phone}`, `Adrès: ${f.address}`]
    answerList().slice(0, 8).forEach(a => lines.push(`${a.label.replace(/\s*\?\s*$/, '')}: ${typeof a.value === 'boolean' ? (a.value ? 'Wi' : 'Non') : a.value}`))
    return lines.join('\n').slice(0, 900)
  }
  const waLink = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(summary())}`

  const submit = async () => {
    if (!validate(stepIdx) || sending) return
    setSending(true); setNetErr('')
    try {
      const body = { fullName: f.fullName, phone: f.phone, address: f.address, acceptRules: true, acceptContact: true, website: f.website, answers: answerList() }
      const res = await fetch(`${SOL_API}/api/sol/join-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 400 && data.field) {
        setErrs({ [data.field]: data.message })
        const idx = ['fullName', 'phone', 'address'].includes(data.field) ? 0 : Math.max(0, steps.findIndex(g => g.qs.some(q => q.id === data.field)))
        setStep(data.field === 'acceptRules' ? last : idx)
        return
      }
      if (!res.ok) throw new Error(data.message || 'Pa ka voye demann lan.')
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* */ }
      setDone({ duplicate: !!data.duplicate })
    } catch (err) {
      setNetErr(err.message && err.message !== 'Failed to fetch' ? err.message : 'Pa gen koneksyon. Eseye ankò, oswa voye done ou yo sou WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  const first = f.fullName.trim().split(/\s+/)[0] || ''
  const pct = done ? 100 : ((stepIdx + 1) / steps.length) * 100

  return (
    <div className="sj-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Fòm pou antre nan sòl la">
      <style>{`
        .sj-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: flex-end; justify-content: center; background: rgba(4,18,60,.62); animation: sjFade .25s ease; }
        @supports (backdrop-filter: blur(1px)) { .sj-overlay { backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); } }
        @media (min-width: 640px) { .sj-overlay { align-items: center; padding: 20px; } }
        @keyframes sjFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sjUp   { from { opacity: 0; transform: translateY(60px) scale(.98) } to { opacity: 1; transform: none } }
        @keyframes sjIn   { from { opacity: 0; transform: translateX(28px) } to { opacity: 1; transform: none } }
        @keyframes sjShine{ 0% { background-position: 170% 0 } 55%,100% { background-position: -70% 0 } }
        @keyframes sjDraw { from { stroke-dashoffset: 60 } to { stroke-dashoffset: 0 } }
        @keyframes sjPulse{ 0% { transform: scale(.8); opacity: .8 } 100% { transform: scale(2.2); opacity: 0 } }
        @keyframes sjSpark{ 0% { transform: translate(0,0) scale(.4); opacity: 0 } 15% { opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0 } }
        @keyframes sjSpin { to { transform: rotate(360deg) } }

        .sj-sheet { position: relative; width: 100%; max-width: 580px; max-height: 94dvh; max-height: 94vh; overflow-y: auto; overflow-x: hidden; background: #fff; color: #132B5E; border-radius: 30px 30px 0 0; box-shadow: 0 -20px 80px rgba(0,20,90,.45); animation: sjUp .45s cubic-bezier(.2,.8,.2,1); font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-overflow-scrolling: touch; }
        @media (min-width: 640px) { .sj-sheet { border-radius: 30px; max-height: 92vh; } }
        .sj-top { position: sticky; top: 0; z-index: 5; padding: 14px 20px 12px; background: linear-gradient(180deg, #fff 82%, rgba(255,255,255,0)); }
        .sj-bar { height: 7px; border-radius: 7px; background: #E4ECFB; overflow: hidden; }
        .sj-bar i { display: block; height: 100%; border-radius: 7px; width: var(--p); background: linear-gradient(90deg, #FFB300, #FF6A00); transition: width .6s cubic-bezier(.2,.8,.2,1); position: relative; overflow: hidden; }
        .sj-bar i::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,.65) 50%, transparent 65%) 170% 0 / 260% 100% no-repeat; animation: sjShine 2.6s ease-in-out infinite; }
        .sj-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; font-size: 12px; font-weight: 800; color: #5B6C93; }
        .sj-x { position: absolute; top: 12px; right: 14px; width: 38px; height: 38px; border-radius: 13px; border: none; background: #EEF3FF; color: #132B5E; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 6; }
        .sj-x:hover { background: #DCE7FF; }
        .sj-head { display: flex; gap: 14px; align-items: center; padding: 4px 20px 6px; padding-right: 64px; }
        .sj-ico { width: 52px; height: 52px; border-radius: 17px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(145deg, #0B4BD6, #0B2F86); box-shadow: 0 12px 24px -10px rgba(11,75,214,.7), 0 0 0 3px #FFE9A6; }
        .sj-head h2 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 25px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; color: #0B2F86; }
        .sj-head p { margin-top: 4px; font-size: 13px; font-weight: 600; color: #5B6C93; line-height: 1.45; }
        .sj-body { padding: 14px 20px 8px; animation: sjIn .38s cubic-bezier(.2,.8,.2,1); }
        .sj-f { margin-bottom: 14px; }
        .sj-f > label, .sj-q { display: block; margin-bottom: 7px; font-size: 13.5px; font-weight: 800; color: #132B5E; line-height: 1.4; }
        .sj-f > label b { color: #FF6A00; }
        .sj-f input, .sj-f textarea { width: 100%; padding: 13px 14px; border-radius: 15px; border: 1.5px solid #9DB0D6; background: #fff; color: #132B5E; font: inherit; font-size: 16px; font-weight: 500; transition: border-color .2s, box-shadow .2s; }
        .sj-f textarea { resize: vertical; min-height: 84px; line-height: 1.5; }
        .sj-f input::placeholder, .sj-f textarea::placeholder { color: #7A8BB0; }
        .sj-f input:focus, .sj-f textarea:focus { outline: none; border-color: #0B4BD6; box-shadow: 0 0 0 4px rgba(11,75,214,.14); }
        .sj-f input.bad { border-color: #E04646; }
        .sj-err { margin-top: 6px; font-size: 12.5px; font-weight: 700; color: #C62828; }
        .sj-yn { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
        .sj-yn button { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 10px; border-radius: 16px; border: 1.5px solid #B7C6E6; background: #F6F9FF; color: #132B5E; font: inherit; font-weight: 800; font-size: 15px; cursor: pointer; transition: transform .15s, background .2s, border-color .2s, box-shadow .2s; }
        .sj-yn button:hover { transform: translateY(-2px); }
        .sj-yn button.on { color: #fff; border-color: transparent; background: linear-gradient(145deg, #16A34A, #0F7A38); box-shadow: 0 12px 22px -10px rgba(22,163,74,.8); }
        .sj-yn button.on.no { background: linear-gradient(145deg, #5B6C93, #3C4B70); box-shadow: 0 12px 22px -10px rgba(60,75,112,.8); }
        .sj-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .sj-chips button { padding: 10px 15px; border-radius: 99px; border: 1.5px solid #B7C6E6; background: #F6F9FF; color: #132B5E; font: inherit; font-weight: 700; font-size: 13.5px; cursor: pointer; transition: transform .15s, background .2s, border-color .2s; }
        .sj-chips button:hover { transform: translateY(-2px); }
        .sj-chips button.on { color: #fff; border-color: transparent; background: linear-gradient(135deg, #0B4BD6, #0B2F86); box-shadow: 0 10px 18px -10px rgba(11,75,214,.9); }
        .sj-chips button.gold.on { color: #3B2600; background: linear-gradient(135deg, #FFE08A, #F5B301 60%, #E39A00); box-shadow: 0 10px 18px -8px rgba(229,154,0,.9); }
        .sj-sub { margin: 4px 0 14px; padding: 14px 14px 2px; border-radius: 18px; background: #F2F7FF; border: 1px solid #D5E2FA; animation: sjIn .3s ease; }
        .sj-step { display: flex; align-items: center; gap: 14px; }
        .sj-step button { width: 42px; height: 42px; border-radius: 14px; border: 1.5px solid #B7C6E6; background: #fff; color: #0B2F86; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .sj-step strong { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; min-width: 38px; text-align: center; color: #0B2F86; }
        .sj-check { display: flex; gap: 11px; align-items: flex-start; margin-bottom: 12px; font-size: 13.5px; font-weight: 600; line-height: 1.5; color: #132B5E; cursor: pointer; }
        .sj-check input { position: absolute; opacity: 0; pointer-events: none; }
        .sj-check i { width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0; margin-top: 1px; border: 2px solid #6C7FA8; background: #fff; display: flex; align-items: center; justify-content: center; color: #fff; transition: background .2s, border-color .2s; }
        .sj-check i svg { opacity: 0; transform: scale(.3); transition: opacity .15s, transform .25s cubic-bezier(.2,.9,.3,1.5); }
        .sj-check input:checked + i { background: #0B4BD6; border-color: #0B4BD6; } .sj-check input:checked + i svg { opacity: 1; transform: scale(1); }
        .sj-check input:focus-visible + i { outline: 2px solid #0B4BD6; outline-offset: 2px; }
        .sj-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
        .sj-foot { position: sticky; bottom: 0; display: flex; gap: 10px; padding: 14px 20px calc(16px + env(safe-area-inset-bottom)); background: linear-gradient(0deg, #fff 80%, rgba(255,255,255,0)); }
        .sj-btn { height: 56px; border-radius: 17px; border: none; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 18px; letter-spacing: -0.02em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: transform .18s, filter .2s, box-shadow .25s; }
        .sj-btn.ghost { width: 56px; flex-shrink: 0; background: #EEF3FF; color: #0B2F86; }
        .sj-btn.go { position: relative; overflow: hidden; flex: 1; color: #fff; background: linear-gradient(180deg, #FFA11A 0%, #FF6A00 55%, #F04A06 100%); box-shadow: 0 1px 0 rgba(255,255,255,.55) inset, 0 -3px 0 rgba(160,40,0,.22) inset, 0 16px 28px -10px rgba(255,90,0,.7); }
        .sj-btn.go::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(108deg, transparent 38%, rgba(255,255,255,.5) 50%, transparent 62%) 170% 0 / 260% 100% no-repeat; animation: sjShine 3.8s ease-in-out 1s infinite; }
        .sj-btn.go:hover:not(:disabled) { transform: translateY(-2px); }
        .sj-btn.go:disabled { filter: saturate(.7); cursor: progress; }
        .sj-neterr { margin: 0 20px 10px; padding: 12px 14px; border-radius: 14px; background: #FFF1F1; border: 1px solid #F5A3A3; color: #7F1D1D; font-size: 13px; font-weight: 700; line-height: 1.5; }
        .sj-neterr a { color: #15803D; font-weight: 800; }
        .sj-ok { padding: 38px 24px 30px; text-align: center; animation: sjIn .45s cubic-bezier(.2,.8,.2,1); }
        .sj-ok-ring { position: relative; width: 104px; height: 104px; margin: 0 auto 20px; }
        .sj-ok-ring > i { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #F5B301; animation: sjPulse 2s ease-out infinite; }
        .sj-ok-ring > i + i { animation-delay: 1s; }
        .sj-ok-ring > span { position: absolute; inset: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(145deg, #FFE08A, #F5B301 55%, #E39A00); box-shadow: 0 16px 34px -10px rgba(229,154,0,.9); }
        .sj-ok-ring svg path { stroke-dasharray: 60; animation: sjDraw .7s ease-out .3s both; }
        .sj-spark { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4px; border-radius: 3px; background: var(--c); animation: sjSpark 1.3s ease-out var(--d) both; }
        .sj-ok h2 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800; letter-spacing: -0.045em; color: #0B2F86; line-height: 1.05; }
        .sj-ok h2 em { font-style: normal; background: linear-gradient(90deg, #F5B301, #FF6A00); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .sj-ok p { margin: 12px auto 0; max-width: 28em; font-size: 14.5px; font-weight: 600; color: #34496F; line-height: 1.6; }
        .sj-wa { display: inline-flex; align-items: center; gap: 9px; margin-top: 20px; padding: 14px 20px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 14.5px; color: #fff; background: linear-gradient(145deg, #22C55E, #15803D); box-shadow: 0 14px 26px -10px rgba(22,163,74,.8); }
        .sj-close2 { display: block; margin: 14px auto 0; background: none; border: none; font: inherit; font-weight: 800; color: #0B4BD6; cursor: pointer; padding: 8px; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; } }
      `}</style>

      <FormCtx.Provider value={{ f, set, errs, ans, setAns, other, setOther }}>
      <div className="sj-sheet" ref={sheetRef}>
        <button className="sj-x" onClick={onClose} aria-label="Fèmen"><X size={20} /></button>

        {done ? (
          <div className="sj-ok" role="status">
            <div className="sj-ok-ring">
              <i /><i />
              <span><svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#3B2600" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              {[['#F5B301', -70, -64], ['#FF6A00', 68, -60], ['#0B4BD6', -78, 40], ['#22C55E', 74, 46], ['#F5B301', 6, -88], ['#FF6A00', -20, 86]].map(([c, dx, dy], i) => (
                <b key={i} className="sj-spark" style={{ '--c': c, '--dx': `${dx}px`, '--dy': `${dy}px`, '--d': `${0.25 + i * 0.07}s` }} />
              ))}
            </div>
            <h2>Mèsi{first ? `, ${first}` : ''} ! <em>Demann ou a rive.</em></h2>
            <p>{done.duplicate ? 'Nou te deja resevwa yon demann ak nimewo sa a. ' : ''}Responsab sòl la ap kontakte w sou <strong>{f.phone}</strong> pou li di w kijan pou w antre. Si ou gen yon kesyè ijan, ou ka ekri nou dirèk sou WhatsApp.</p>
            <a className="sj-wa" href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /> Voye yon kopi sou WhatsApp</a>
            <button className="sj-close2" onClick={onClose}>Retounen nan koneksyon</button>
          </div>
        ) : (
          <>
            <div className="sj-top" style={{ '--p': `${pct}%` }}>
              <div className="sj-bar"><i /></div>
              <div className="sj-meta"><span>Etap {stepIdx + 1} sou {steps.length}</span><span>{Math.round(pct)}%</span></div>
            </div>

            <div className="sj-head">
              <div className="sj-ico"><Icon size={25} /></div>
              <div><h2>{S.title}</h2>{S.sub && <p>{S.sub}</p>}</div>
            </div>

            <div className="sj-body" key={stepIdx}>
              {stepIdx === 0 && (
                <>
                  <Text k="fullName" label="Non konplè" req ph="Non ak prenon ou" auto="name" />
                  <Text k="phone" label="Telefòn (WhatsApp si posib)" req ph="+509 ..." type="tel" auto="tel" inputMode="tel" />
                  <Text k="address" label="Adrès ou" req ph="Vil/komin, katye, ri" auto="street-address" />
                </>
              )}

              {renderQuestions(S.qs)}

              {stepIdx === last && (
                <>
                  <label className="sj-check">
                    <input type="checkbox" checked={f.acceptRules} onChange={e => set('acceptRules', e.target.checked)} />
                    <i><Check size={15} strokeWidth={3.6} /></i>
                    <span>Mwen konprann ke sòl la mande peman alè, epi yon reta ka bloke kont mwen jiskaske m peye.</span>
                  </label>
                  <Err k="acceptRules" />
                  <label className="sj-check">
                    <input type="checkbox" checked={f.acceptContact} onChange={e => set('acceptContact', e.target.checked)} />
                    <i><Check size={15} strokeWidth={3.6} /></i>
                    <span>Mwen pèmèt responsab sòl la kontakte m sou nimewo m bay la.</span>
                  </label>
                  <Err k="acceptContact" />
                  <div className="sj-hp" aria-hidden="true"><label>Sit entènèt<input tabIndex={-1} autoComplete="off" value={f.website} onChange={e => set('website', e.target.value)} /></label></div>
                </>
              )}
            </div>

            {netErr && (
              <div className="sj-neterr" role="alert">
                {netErr}{' '}
                <a href={waLink} target="_blank" rel="noopener noreferrer">Voye sou WhatsApp</a>
              </div>
            )}

            <div className="sj-foot">
              {stepIdx > 0 && <button type="button" className="sj-btn ghost" onClick={back} aria-label="Retounen"><ArrowLeft size={22} /></button>}
              {stepIdx < last
                ? <button type="button" className="sj-btn go" onClick={next}>Kontinye <ArrowRight size={22} /></button>
                : <button type="button" className="sj-btn go" onClick={submit} disabled={sending}>
                    {sending
                      ? <span style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'sjSpin .8s linear infinite' }} />
                      : <Send size={20} />}
                    {sending ? 'Ap voye…' : 'Voye demann lan'}
                  </button>}
            </div>
          </>
        )}
      </div>
      </FormCtx.Provider>
    </div>
  )
}
