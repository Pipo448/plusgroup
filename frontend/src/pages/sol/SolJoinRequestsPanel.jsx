// src/pages/sol/SolJoinRequestsPanel.jsx
// ─── Panèl ADMIN: demann moun ki vle rejwenn sòl/sabotay la ───
// Itilizasyon nan AdminDashboard:  <SolJoinRequestsPanel api={adminApi} />   (axios ou deja genyen a)
// Oswa pou kont li:               <SolJoinRequestsPanel token={adminToken} />
// Gen 2 tab: "Demann" (moun ki ranpli fòm lan) ak "Kesyon" (editè kesyon fòm lan).
// Pa bezwen okenn wout nouvo nan App: mete l nan nenpòt paj admin ou deja genyen.
import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, MessageCircle, Phone, MapPin, Search, ChevronDown, Check } from 'lucide-react'
import SolJoinQuestionsEditor from './SolJoinQuestionsEditor'

const API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

// Si pa gen axios (api) nan prop yo, nou fè yon ti kliyan fetch ki pale ak menm wout yo (/api/v1/sol/...)
const normErr = (e) => new Error(e?.response?.data?.message || e?.message || 'Erè')
function wrapAxios(ax) {
  return {
    get:   (u, params) => ax.get(u, params ? { params } : undefined).then(r => r.data).catch(e => { throw normErr(e) }),
    patch: (u, b)      => ax.patch(u, b).then(r => r.data).catch(e => { throw normErr(e) }),
    put:   (u, b)      => ax.put(u, b).then(r => r.data).catch(e => { throw normErr(e) }),
  }
}
function fetchApi(token) {
  const call = async (method, u, body) => {
    const r = await fetch(`${API}/api/v1${u}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.message || 'Erè')
    return d
  }
  return {
    get: (u, params) => call('GET', params ? `${u}?${new URLSearchParams(params)}` : u),
    patch: (u, b) => call('PATCH', u, b), put: (u, b) => call('PUT', u, b),
  }
}
const STATUS = [
  { id: 'nouvo',    label: 'Nouvo',     color: '#2563EB' },
  { id: 'kontakte', label: 'Kontakte',  color: '#D97706' },
  { id: 'aksepte',  label: 'Aksepte',   color: '#16A34A' },
  { id: 'refize',   label: 'Refize',    color: '#DC2626' },
]
const FREQ = { chak_jou: 'Chak jou', chak_semen: 'Chak semèn', chak_de_semen: 'Chak 2 semèn', chak_mwa: 'Chak mwa' }
const yn = (v) => (v === true ? 'Wi' : v === false ? 'Non' : '—')
const digits = (p) => String(p || '').replace(/\D/g, '')
const when = (d) => { try { return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) } catch { return '' } }

function Line({ k, v }) {
  if (v === null || v === undefined || v === '') return null
  return <div className="jr-line"><span>{k}</span><b>{v}</b></div>
}

export default function SolJoinRequestsPanel({ api: axiosInstance, token }) {
  const tk = token || (typeof localStorage !== 'undefined' && (() => { try { return JSON.parse(localStorage.getItem('pg-admin') || '{}').token } catch { return '' } })()) || ''
  const api = useMemo(() => (axiosInstance ? wrapAxios(axiosInstance) : fetchApi(tk)), [axiosInstance, tk])
  const [view, setView] = useState('requests')
  const [rows, setRows]     = useState([])
  const [counts, setCounts] = useState({})
  const [filter, setFilter] = useState('nouvo')
  const [q, setQ]           = useState('')
  const [open, setOpen]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr]       = useState('')
  const [notes, setNotes]   = useState({})
  const [busy, setBusy]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const d = await api.get('/sol/admin/join-requests', filter === 'all' ? undefined : { status: filter })
      setRows(d.requests || []); setCounts(d.counts || {})
    } catch (e) { setErr(e.message || 'Pa ka chaje demann yo') }
    setLoading(false)
  }, [filter, api])
  useEffect(() => { if (view === 'requests') load() }, [load, view])

  const patch = async (id, body) => {
    setBusy(id)
    try { await api.patch(`/sol/admin/join-requests/${id}`, body); await load() }
    catch (e) { setErr(e.message) }
    setBusy(null)
  }

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? rows.filter(r => `${r.fullName} ${r.phone} ${r.address}`.toLowerCase().includes(t)) : rows
  }, [rows, q])
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="jr">
      <style>{`
        .jr{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0F172A;max-width:900px;margin:0 auto;padding:4px}
        .jr *{box-sizing:border-box}
        .jr-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
        .jr-head h2{font-size:20px;font-weight:800;letter-spacing:-.02em}
        .jr-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #CBD5E1;background:#fff;border-radius:10px;padding:8px 12px;font:600 12.5px inherit;cursor:pointer;color:#0F172A}
        .jr-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px}
        .jr-tab{flex-shrink:0;border:1px solid #CBD5E1;background:#fff;border-radius:99px;padding:7px 13px;font:700 12.5px inherit;cursor:pointer;color:#475569}
        .jr-tab.on{background:#0F172A;border-color:#0F172A;color:#fff}
        .jr-tab i{font-style:normal;margin-left:6px;opacity:.7}
        .jr-search{position:relative;margin-bottom:12px}
        .jr-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94A3B8}
        .jr-search input{width:100%;height:42px;border:1px solid #CBD5E1;border-radius:12px;padding:0 12px 0 36px;font:500 14px inherit}
        .jr-card{background:#fff;border:1px solid #E2E8F0;border-left:4px solid var(--c,#2563EB);border-radius:14px;margin-bottom:10px;overflow:hidden}
        .jr-top{display:flex;align-items:center;gap:10px;padding:13px 14px;width:100%;background:none;border:0;text-align:left;cursor:pointer;font:inherit;color:inherit}
        .jr-top b{font-size:14.5px}
        .jr-sub{font-size:12px;color:#64748B;margin-top:2px}
        .jr-pill{font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px;color:var(--c);background:color-mix(in srgb,var(--c) 12%,#fff)}
        .jr-body{padding:2px 14px 14px;border-top:1px solid #F1F5F9}
        .jr-line{display:flex;gap:10px;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #E2E8F0;font-size:13px}
        .jr-line span{color:#64748B;flex-shrink:0}.jr-line b{text-align:right;font-weight:600;white-space:pre-wrap;word-break:break-word}
        .jr-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
        .jr-st{border:1.5px solid var(--c);color:var(--c);background:#fff;border-radius:10px;padding:8px 12px;font:700 12.5px inherit;cursor:pointer}
        .jr-st.on{background:var(--c);color:#fff}
        .jr-note{width:100%;margin-top:10px;border:1px solid #CBD5E1;border-radius:10px;padding:9px 11px;font:500 13px inherit;min-height:60px;resize:vertical}
        .jr-empty{text-align:center;color:#64748B;padding:36px 10px;font-size:14px}
        .jr-err{background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:10px}
        .jr-a{display:inline-flex;align-items:center;gap:5px;color:#16A34A;font-weight:700;font-size:12.5px;text-decoration:none;margin-right:12px}
      `}</style>

      <div className="jr-head">
        <h2>Rejwenn sòl la</h2>
        {view === 'requests' && <button className="jr-btn" onClick={load}><RefreshCw size={14} /> Rafrechi</button>}
      </div>
      <div className="jr-tabs">
        <button className={`jr-tab ${view === 'requests' ? 'on' : ''}`} onClick={() => setView('requests')}>Demann<i>{total}</i></button>
        <button className={`jr-tab ${view === 'questions' ? 'on' : ''}`} onClick={() => setView('questions')}>Kesyon fòm lan</button>
      </div>
      {view === 'questions' && <SolJoinQuestionsEditor api={api} />}
      {view === 'requests' && (<>

      <div className="jr-tabs">
        {[{ id: 'all', label: 'Tout' }, ...STATUS].map(s => (
          <button key={s.id} className={`jr-tab ${filter === s.id ? 'on' : ''}`} onClick={() => setFilter(s.id)}>
            {s.label}<i>{s.id === 'all' ? total : (counts[s.id] || 0)}</i>
          </button>
        ))}
      </div>

      <div className="jr-search"><Search size={15} /><input placeholder="Chèche non, telefòn, adrès…" value={q} onChange={e => setQ(e.target.value)} /></div>
      {err && <div className="jr-err">{err}</div>}
      {loading && <div className="jr-empty">Ap chaje…</div>}
      {!loading && !list.length && !err && <div className="jr-empty">Pa gen demann isit la.</div>}

      {list.map(r => {
        const st = STATUS.find(s => s.id === r.status) || STATUS[0]
        const isOpen = open === r.id
        const wa = `https://wa.me/${digits(r.phone)}?text=${encodeURIComponent(`Bonjou ${r.fullName}, nou resevwa demann ou pou rejwenn sòl la. `)}`
        return (
          <div key={r.id} className="jr-card" style={{ '--c': st.color }}>
            <button className="jr-top" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{r.fullName}</b>
                <div className="jr-sub">{r.phone} · {when(r.createdAt)}</div>
              </div>
              <span className="jr-pill">{st.label}</span>
              <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.2s', color: '#94A3B8' }} />
            </button>
            {isOpen && (
              <div className="jr-body">
                <div style={{ margin: '10px 0 4px' }}>
                  <a className="jr-a" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                  <a className="jr-a" style={{ color: '#2563EB' }} href={`tel:${r.phone}`}><Phone size={14} /> Rele</a>
                  {r.address && <span style={{ fontSize: 12.5, color: '#64748B' }}><MapPin size={12} style={{ verticalAlign: -1 }} /> {r.address}</span>}
                </div>
                {Array.isArray(r.extra) && r.extra.length
                  ? r.extra.map(x => <Line key={x.id} k={x.label} v={typeof x.value === 'boolean' ? (x.value ? 'Wi' : 'Non') : String(x.value)} />)
                  : (<>
                      <Line k="Metye" v={r.occupation} />
                      <Line k="Te nan sòl nou" v={yn(r.beenInOurSol)} />
                      <Line k="Sa li renmen" v={r.likedText} />
                      <Line k="Sa li pa renmen" v={r.dislikedText} />
                      <Line k="Moun ki refere l" v={r.referrer} />
                      <Line k="Ki jan li konnen" v={r.howKnow} />
                      <Line k="Te nan lòt sòl" v={yn(r.joinedOtherSol)} />
                      <Line k="Detay lòt sòl" v={r.otherSolText} />
                      <Line k="Frekans" v={FREQ[r.frequency] || r.frequency} />
                      <Line k="Montan" v={r.amount ? `${r.amount} HTG` : r.amountOther} />
                      <Line k="Kantite men" v={r.slots} />
                      <Line k="Kòmanse" v={r.startWhen} />
                      <Line k="Ka rekrite moun" v={yn(r.canRecruit)} />
                      <Line k="Moun li pwopoze" v={r.recruitList} />
                      <Line k="Mesaj" v={r.message} />
                    </>)}
                <div className="jr-acts">
                  {STATUS.map(s => (
                    <button key={s.id} className={`jr-st ${r.status === s.id ? 'on' : ''}`} style={{ '--c': s.color }} disabled={busy === r.id}
                      onClick={() => patch(r.id, { status: s.id })}>
                      {r.status === s.id && <Check size={12} style={{ verticalAlign: -1 }} />} {s.label}
                    </button>
                  ))}
                </div>
                <textarea className="jr-note" placeholder="Nòt admin (pa vizib pou kliyan)…"
                  value={notes[r.id] ?? r.adminNote ?? ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} />
                <button className="jr-btn" style={{ marginTop: 8 }} disabled={busy === r.id}
                  onClick={() => patch(r.id, { adminNote: notes[r.id] ?? r.adminNote ?? '' })}>Sove nòt la</button>
              </div>
            )}
          </div>
        )
      })}
      </>)}
    </div>
  )
}
