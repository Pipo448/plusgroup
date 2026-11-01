// src/pages/sol/SolJoinQuestionsEditor.jsx
// ─── Editè kesyon fòm "Rejwenn kominote a" (admin) ───
// Admin ka: chanje tèks, tip, obligatwa/opsyonèl, retire (dezaktive), reòdone, ajoute nouvo kesyon,
// kreye/modifye etap yo, ak fè yon kesyon parèt sèlman si yon lòt repons se Wi/Non (oswa yon chwa presi).
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, Save, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { DEFAULT_CONFIG, normalizeConfig, Q_TYPES } from './solJoinConfig'

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9_]+/, '').slice(0, 30)
const RESERVED = ['fullname', 'phone', 'address', 'acceptrules', 'acceptcontact', 'website']

export default function SolJoinQuestionsEditor({ api }) {
  const [cfg, setCfg]       = useState(null)
  const [saved, setSaved]   = useState(null)   // JSON dènye vèsyon ki sove (pou detekte chanjman)
  const [custom, setCustom] = useState(false)  // eske gen yon konfigirasyon ki sove nan DB
  const [open, setOpen]     = useState(null)
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState(null)

  const load = useCallback(async () => {
    try {
      const d = await api.get('/sol/admin/join-config')
      const c = normalizeConfig(d.config)
      setCfg(c); setSaved(JSON.stringify(c)); setCustom(!!d.config)
    } catch (e) { setMsg({ bad: true, t: e.message || 'Pa ka chaje kesyon yo' }) }
  }, [api])
  useEffect(() => { load() }, [load])

  if (!cfg) return <div className="jr-empty">{msg ? <span style={{ color: '#B91C1C' }}>{msg.t}</span> : 'Ap chaje…'}</div>

  const dirty = JSON.stringify(cfg) !== saved
  const upQ = (id, patch) => setCfg(c => ({ ...c, questions: c.questions.map(q => (q.id === id ? { ...q, ...patch } : q)) }))
  const upG = (id, patch) => setCfg(c => ({ ...c, groups: c.groups.map(g => (g.id === id ? { ...g, ...patch } : g)) }))

  const move = (id, dir) => setCfg(c => {
    const arr = [...c.questions]; const i = arr.findIndex(q => q.id === id); const g = arr[i].group
    let j = i + dir
    while (j >= 0 && j < arr.length && arr[j].group !== g) j += dir
    if (j < 0 || j >= arr.length) return c
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    return { ...c, questions: arr }
  })
  const moveG = (id, dir) => setCfg(c => {
    const arr = [...c.groups]; const i = arr.findIndex(g => g.id === id); const j = i + dir
    if (j < 0 || j >= arr.length) return c
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    return { ...c, groups: arr }
  })
  const delQ = (id) => {
    if (!window.confirm('Efase kesyon sa a? (Pi bon, dezaktive l si w ka bezwen l pita.)')) return
    setCfg(c => ({ ...c, questions: c.questions.filter(q => q.id !== id).map(q => (q.showIf?.id === id ? { ...q, showIf: null } : q)) }))
  }
  const addQ = (group) => {
    let n = 1; const ids = new Set(cfg.questions.map(q => q.id))
    while (ids.has(`kesyon_${n}`)) n++
    const q = { id: `kesyon_${n}`, group, type: 'text', label: '', required: false, active: true, placeholder: '', options: [], allowOther: false, gold: false, yesLabel: '', noLabel: '', min: 1, max: 10, showIf: null, _new: true }
    setCfg(c => ({ ...c, questions: [...c.questions, q] })); setOpen(q.id)
  }
  const addG = () => {
    let n = 1; const ids = new Set(cfg.groups.map(g => g.id))
    while (ids.has(`g${n}`)) n++
    setCfg(c => ({ ...c, groups: [...c.groups, { id: `g${n}`, title: 'Nouvo etap', sub: '' }] }))
  }
  const delG = (id) => {
    if (cfg.groups.length < 2) return
    const n = cfg.questions.filter(q => q.group === id).length
    if (!window.confirm(n ? `Etap sa a gen ${n} kesyon. Yo ap pase nan premye etap la. Kontinye?` : 'Efase etap sa a?')) return
    setCfg(c => { const gs = c.groups.filter(g => g.id !== id); return { groups: gs, questions: c.questions.map(q => (q.group === id ? { ...q, group: gs[0].id } : q)) } })
  }

  const save = async () => {
    for (const q of cfg.questions) {
      if (!q.label.trim()) { setOpen(q.id); return setMsg({ bad: true, t: 'Gen yon kesyon ki pa gen tèks.' }) }
      if (q.type === 'choice' && !q.options.filter(o => o.trim()).length && !q.allowOther) { setOpen(q.id); return setMsg({ bad: true, t: `"${q.label}" bezwen omwen yon chwa.` }) }
      if (RESERVED.includes(q.id)) { setOpen(q.id); return setMsg({ bad: true, t: `ID "${q.id}" rezève.` }) }
    }
    const seen = new Set()
    for (const q of cfg.questions) { if (seen.has(q.id)) { setOpen(q.id); return setMsg({ bad: true, t: `Gen 2 kesyon ki pran menm ID (${q.id}). Chanje tèks youn nan yo.` }) } seen.add(q.id) }
    setBusy(true); setMsg(null)
    try {
      const payload = { groups: cfg.groups, questions: cfg.questions.map(({ _new, ...q }) => ({ ...q, options: q.options.map(o => o.trim()).filter(Boolean) })) }
      const d = await api.put('/sol/admin/join-config', payload)
      const c = normalizeConfig(d.config); setCfg(c); setSaved(JSON.stringify(c)); setCustom(true)
      setMsg({ t: 'Sove! Fòm piblik la ap itilize kesyon sa yo (rafrechi paj la si w ouvè l).' })
    } catch (e) { setMsg({ bad: true, t: e.message || 'Pa ka sove' }) }
    setBusy(false)
  }
  const reset = async () => {
    if (!window.confirm('Retounen nan kesyon orijinal yo? Kesyon ou modifye/ajoute yo ap disparèt (repons ki deja resevwa yo pa afekte).')) return
    setBusy(true)
    try { await api.put('/sol/admin/join-config', { reset: true }); const c = normalizeConfig(DEFAULT_CONFIG); setCfg(c); setSaved(JSON.stringify(c)); setCustom(false); setMsg({ t: 'Kesyon orijinal yo retounen.' }) }
    catch (e) { setMsg({ bad: true, t: e.message || 'Erè' }) }
    setBusy(false)
  }

  return (
    <div className="jq">
      <style>{`
        .jq p.hint{font-size:12.5px;color:#64748B;line-height:1.55;margin:0 0 12px}
        .jq-bar{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0;background:#F1F5F9}
        .jq-bar .sp{flex:1}
        .jq-prim{background:#0F172A;color:#fff;border-color:#0F172A}
        .jq-prim:disabled{opacity:.45;cursor:not-allowed}
        .jq-msg{font-size:12.5px;font-weight:700;padding:8px 11px;border-radius:9px;background:#ECFDF5;color:#047857}
        .jq-msg.bad{background:#FEF2F2;color:#B91C1C}
        .jq-g{background:#fff;border:1px solid #E2E8F0;border-radius:14px;margin-bottom:14px;padding:12px}
        .jq-gh{display:flex;gap:8px;align-items:flex-start;margin-bottom:10px}
        .jq-gh .c{flex:1;display:grid;gap:6px}
        .jq input,.jq textarea,.jq select{width:100%;border:1px solid #CBD5E1;border-radius:9px;padding:8px 10px;font:500 13.5px inherit;background:#fff;color:#0F172A}
        .jq textarea{min-height:72px;resize:vertical}
        .jq label.l{display:block;font-size:11.5px;font-weight:700;color:#64748B;margin:9px 0 4px}
        .jq-q{border:1px solid #E2E8F0;border-radius:11px;margin-bottom:7px;background:#F8FAFC}
        .jq-q.off{opacity:.55}
        .jq-qh{display:flex;align-items:center;gap:6px;padding:8px 8px 8px 11px}
        .jq-qh button.t{flex:1;min-width:0;text-align:left;background:none;border:0;cursor:pointer;font:600 13.5px inherit;color:#0F172A;display:flex;gap:8px;align-items:center}
        .jq-qh button.t span.n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
        .jq-ib{background:#fff;border:1px solid #CBD5E1;border-radius:8px;padding:5px;cursor:pointer;display:inline-flex;color:#475569}
        .jq-ib:disabled{opacity:.3;cursor:default}
        .jq-tag{font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:99px;background:#E0E7FF;color:#3730A3;flex-shrink:0}
        .jq-tag.r{background:#FFEDD5;color:#C2410C}.jq-tag.c{background:#FEF3C7;color:#92400E}
        .jq-body{padding:2px 12px 12px;border-top:1px solid #E2E8F0}
        .jq-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media(max-width:520px){.jq-row{grid-template-columns:1fr}}
        .jq-ck{display:flex;gap:8px;align-items:center;font-size:13px;font-weight:600;margin-top:10px}
        .jq-ck input{width:auto}
      `}</style>

      <p className="hint">
        Non, telefòn ak adrès toujou obligatwa epi yo pa modifyab, menm jan ak 2 kazye aksepte yo nan fen fòm lan.
        Tout lòt kesyon yo se ou ki deside: chanje tèks, ajoute, dezaktive (ikòn je), oswa deplase yo.
        {custom ? ' Ou ap itilize kesyon pèsonalize.' : ' Kounye a ou ap itilize kesyon orijinal yo.'}
      </p>

      <div className="jq-bar">
        <button className="jr-btn jq-prim" onClick={save} disabled={busy || !dirty}><Save size={14} /> {busy ? 'Ap sove…' : 'Sove chanjman yo'}</button>
        <button className="jr-btn" onClick={addG}><Plus size={14} /> Nouvo etap</button>
        {custom && <button className="jr-btn" onClick={reset} disabled={busy}><RotateCcw size={14} /> Retounen orijinal</button>}
        <span className="sp" />
        {dirty && <span style={{ fontSize: 12, fontWeight: 700, color: '#C2410C' }}>Chanjman pa sove</span>}
      </div>
      {msg && <div className={`jq-msg ${msg.bad ? 'bad' : ''}`} style={{ marginBottom: 10 }}>{msg.t}</div>}

      {cfg.groups.map((g, gi) => {
        const qs = cfg.questions.filter(q => q.group === g.id)
        return (
          <div key={g.id} className="jq-g">
            <div className="jq-gh">
              <div className="c">
                <input value={g.title} onChange={e => upG(g.id, { title: e.target.value })} placeholder="Tit etap la" style={{ fontWeight: 800 }} aria-label="Tit etap" />
                <input value={g.sub} onChange={e => upG(g.id, { sub: e.target.value })} placeholder="Ti eksplikasyon (opsyonèl)" aria-label="Eksplikasyon etap" />
              </div>
              <button className="jq-ib" disabled={gi === 0} onClick={() => moveG(g.id, -1)} aria-label="Monte etap"><ArrowUp size={14} /></button>
              <button className="jq-ib" disabled={gi === cfg.groups.length - 1} onClick={() => moveG(g.id, 1)} aria-label="Desann etap"><ArrowDown size={14} /></button>
              <button className="jq-ib" disabled={cfg.groups.length < 2} onClick={() => delG(g.id)} aria-label="Efase etap"><Trash2 size={14} /></button>
            </div>
            {gi === 0 && <p className="hint" style={{ margin: '0 0 8px' }}>Non, telefòn ak adrès parèt anlè nan etap sa a.</p>}
            {gi === cfg.groups.length - 1 && <p className="hint" style={{ margin: '0 0 8px' }}>2 kazye aksepte yo parèt anba nan etap sa a.</p>}

            {qs.map(q => {
              const isOpen = open === q.id
              const parents = cfg.questions.filter(p => p.id !== q.id && (p.type === 'yesno' || p.type === 'choice'))
              const parent = cfg.questions.find(p => p.id === q.showIf?.id)
              return (
                <div key={q.id} className={`jq-q ${q.active ? '' : 'off'}`}>
                  <div className="jq-qh">
                    <button className="t" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen}>
                      <ChevronDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.2s', flexShrink: 0 }} />
                      <span className="n">{q.label || <i style={{ color: '#94A3B8' }}>(kesyon vid)</i>}</span>
                    </button>
                    {q.required && <span className="jq-tag r">obligatwa</span>}
                    {q.showIf && <span className="jq-tag c">kondisyonèl</span>}
                    <span className="jq-tag">{Q_TYPES.find(t => t.v === q.type)?.l}</span>
                    <button className="jq-ib" onClick={() => upQ(q.id, { active: !q.active })} aria-label={q.active ? 'Dezaktive' : 'Aktive'} title={q.active ? 'Kache nan fòm lan' : 'Montre nan fòm lan'}>{q.active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button className="jq-ib" onClick={() => move(q.id, -1)} aria-label="Monte"><ArrowUp size={14} /></button>
                    <button className="jq-ib" onClick={() => move(q.id, 1)} aria-label="Desann"><ArrowDown size={14} /></button>
                  </div>
                  {isOpen && (
                    <div className="jq-body">
                      <label className="l">Kesyon an (sa moun yo wè)</label>
                      <textarea style={{ minHeight: 56 }} value={q.label} onChange={e => {
                        const label = e.target.value
                        upQ(q.id, q._new ? { label, id: slug(label) || q.id } : { label })
                      }} />
                      <div className="jq-row">
                        <div>
                          <label className="l">Tip repons</label>
                          <select value={q.type} onChange={e => upQ(q.id, { type: e.target.value })}>
                            {Q_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="l">Etap</label>
                          <select value={q.group} onChange={e => upQ(q.id, { group: e.target.value })}>
                            {cfg.groups.map(g2 => <option key={g2.id} value={g2.id}>{g2.title}</option>)}
                          </select>
                        </div>
                      </div>

                      {(q.type === 'text' || q.type === 'textarea') && (<><label className="l">Egzanp ki parèt nan chan an (opsyonèl)</label><input value={q.placeholder} onChange={e => upQ(q.id, { placeholder: e.target.value })} /></>)}
                      {q.type === 'choice' && (
                        <>
                          <label className="l">Chwa yo (youn pa liy)</label>
                          <textarea value={q.options.join('\n')} onChange={e => upQ(q.id, { options: e.target.value.split('\n') })} />
                          <label className="jq-ck"><input type="checkbox" checked={q.allowOther} onChange={e => upQ(q.id, { allowOther: e.target.checked })} /> Ajoute bouton “Lòt” (moun nan ekri pwòp repons li)</label>
                          <label className="jq-ck"><input type="checkbox" checked={q.gold} onChange={e => upQ(q.id, { gold: e.target.checked })} /> Bouton yo an lò (pou montan)</label>
                        </>
                      )}
                      {q.type === 'yesno' && (
                        <div className="jq-row">
                          <div><label className="l">Tèks bouton Wi</label><input value={q.yesLabel} placeholder="Wi" onChange={e => upQ(q.id, { yesLabel: e.target.value })} /></div>
                          <div><label className="l">Tèks bouton Non</label><input value={q.noLabel} placeholder="Non" onChange={e => upQ(q.id, { noLabel: e.target.value })} /></div>
                        </div>
                      )}
                      {q.type === 'stepper' && (
                        <div className="jq-row">
                          <div><label className="l">Minimòm</label><input type="number" value={q.min} onChange={e => upQ(q.id, { min: Number(e.target.value) })} /></div>
                          <div><label className="l">Maksimòm</label><input type="number" value={q.max} onChange={e => upQ(q.id, { max: Number(e.target.value) })} /></div>
                        </div>
                      )}

                      {q.type !== 'stepper' && <label className="jq-ck"><input type="checkbox" checked={q.required} onChange={e => upQ(q.id, { required: e.target.checked })} /> Obligatwa (moun nan pa ka kontinye san repons)</label>}

                      <label className="l">Montre kesyon sa a sèlman si… (opsyonèl)</label>
                      <div className="jq-row">
                        <select value={q.showIf?.id || ''} onChange={e => {
                          const p = cfg.questions.find(x => x.id === e.target.value)
                          upQ(q.id, { showIf: p ? { id: p.id, value: p.type === 'yesno' ? true : (p.options[0] || '') } : null })
                        }}>
                          <option value="">Toujou montre l</option>
                          {parents.map(p => <option key={p.id} value={p.id}>{p.label.slice(0, 50) || p.id}</option>)}
                        </select>
                        {parent && (
                          parent.type === 'yesno'
                            ? <select value={String(q.showIf.value)} onChange={e => upQ(q.id, { showIf: { id: parent.id, value: e.target.value === 'true' } })}><option value="true">repons lan se Wi</option><option value="false">repons lan se Non</option></select>
                            : <select value={q.showIf.value} onChange={e => upQ(q.id, { showIf: { id: parent.id, value: e.target.value } })}>{parent.options.map(o => <option key={o} value={o}>repons lan se “{o}”</option>)}</select>
                        )}
                      </div>

                      <div style={{ marginTop: 12, textAlign: 'right' }}>
                        <button className="jr-btn" style={{ color: '#B91C1C', borderColor: '#FECACA' }} onClick={() => delQ(q.id)}><Trash2 size={13} /> Efase kesyon sa a</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <button className="jr-btn" onClick={() => addQ(g.id)}><Plus size={14} /> Ajoute yon kesyon nan etap sa a</button>
          </div>
        )
      })}
    </div>
  )
}
