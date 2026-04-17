// src/pages/enterprise/mikwo-kredi/MikwoKrediProfit.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet,
  Plus, Trash2, Edit2, RefreshCw, X, ChevronLeft, ChevronRight,
  BarChart2, AlertTriangle,
} from 'lucide-react'

const fmt = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits:2, maximumFractionDigits:2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'

const D = {
  card:'#0d1b2a', cardBorder:'rgba(201,168,76,0.18)',
  gold:'#C9A84C', goldBtn:'linear-gradient(135deg,#C9A84C,#8B6914)', goldDim:'rgba(201,168,76,0.10)',
  green:'#27ae60', greenBg:'rgba(39,174,96,0.12)',
  red:'#C0392B', redBg:'rgba(192,57,43,0.10)',
  orange:'#D97706', orangeBg:'rgba(217,119,6,0.10)',
  blue:'#3B82F6', blueBg:'rgba(59,130,246,0.10)',
  purple:'#8B5CF6',
  text:'#e8eaf0', muted:'#6b7a99', shadow:'0 4px 20px rgba(0,0,0,0.4)',
}

const inputStyle = {
  width:'100%', padding:'10px 13px', borderRadius:9,
  border:'1.5px solid rgba(255,255,255,0.09)', outline:'none',
  color:D.text, background:'#060f1e', fontSize:13,
  boxSizing:'border-box', fontFamily:'inherit',
}
const labelStyle = {
  display:'block', fontSize:11, fontWeight:700, color:'rgba(201,168,76,0.75)',
  marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em',
}

const CATEGORIES = ['Loye','Elektrisite','Dlo','Salè','Founisè','Transpò','Ekipman','Maketing','Lòt']
const CAT_ICONS  = { Loye:'🏠', Elektrisite:'⚡', Dlo:'💧', Salè:'👥', Founisè:'📦', Transpò:'🚗', Ekipman:'🖥️', Maketing:'📢', Lòt:'💼' }

// ─── Mini Modal Depans ─────────────────────────────────────────
function ModalDepans({ dep, onClose, onSuccess }) {
  const isEdit = !!dep?.id
  const now    = new Date().toISOString().split('T')[0]
  const [titre,      setTitre]      = useState(dep?.titre      || '')
  const [montant,    setMontant]    = useState(dep?.montant    || '')
  const [categorie,  setCategorie]  = useState(dep?.categorie  || 'Lòt')
  const [dateDepans, setDateDepans] = useState(dep?.date_depans ? dep.date_depans.split('T')[0] : now)
  const [notes,      setNotes]      = useState(dep?.notes      || '')

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/mikwo-expenses/${dep.id}`, d) : api.post('/mikwo-expenses', d),
    onSuccess: () => { toast.success(isEdit ? '✅ Mizajou!' : '✅ Depans ajoute!'); onSuccess(); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:D.card, borderRadius:16, width:'100%', maxWidth:440, overflow:'hidden', boxShadow:'0 24px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${D.red},#a00)` }}/>
        <div style={{ padding:'16px 18px 14px', borderBottom:`1px solid ${D.cardBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ color:'#fff', margin:0, fontSize:14, fontWeight:800 }}>{isEdit ? 'Edite Depans' : '➕ Nouvo Depans'}</h3>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:7, width:28, height:28, cursor:'pointer', color:D.muted, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <div style={{ padding:'16px 18px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input style={inputStyle} value={titre} onChange={e => setTitre(e.target.value)} placeholder="Loye mwa avril, elektrisite..."/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={labelStyle}>Montan (HTG) *</label>
                <input type="number" min="0" style={inputStyle} value={montant} onChange={e => setMontant(e.target.value)} placeholder="0.00"/>
              </div>
              <div>
                <label style={labelStyle}>Dat</label>
                <input type="date" style={{ ...inputStyle, colorScheme:'dark' }} value={dateDepans} onChange={e => setDateDepans(e.target.value)}/>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Kategori</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategorie(c)}
                    style={{ padding:'6px 4px', borderRadius:7, border:`1.5px solid ${categorie===c ? D.red : 'rgba(255,255,255,0.08)'}`, background: categorie===c ? `${D.red}15` : 'transparent', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:14 }}>{CAT_ICONS[c]}</div>
                    <div style={{ fontSize:9, color: categorie===c ? D.red : D.muted, marginTop:2 }}>{c}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Nòt</label>
              <textarea style={{ ...inputStyle, height:50, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detay..."/>
            </div>
          </div>
        </div>
        <div style={{ padding:'12px 18px', borderTop:`1px solid ${D.cardBorder}`, display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button onClick={() => mutation.mutate({ titre, montant, categorie, dateDepans, notes: notes||undefined })}
            disabled={mutation.isPending || !titre || !montant}
            style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${D.red},#a00)`, color:'#fff', fontWeight:800, cursor:'pointer', opacity: mutation.isPending||!titre||!montant ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {mutation.isPending ? 'Ap sove...' : <><TrendingDown size={14}/> {isEdit ? 'Sove' : 'Ajoute Depans'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kat Revni ────────────────────────────────────────────────
function KatRevni({ label, val, color, icon, desc, badge }) {
  return (
    <div style={{ background:D.card, borderRadius:12, padding:'12px 14px', border:`1px solid ${color}30`, display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:38, height:38, borderRadius:10, background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
          <p style={{ fontSize:10, color:D.muted, margin:0, textTransform:'uppercase', fontWeight:700 }}>{label}</p>
          {badge && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:99, background:`${color}20`, color, fontWeight:800 }}>{badge}</span>}
        </div>
        <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color, margin:0 }}>{fmt(val)} HTG</p>
        <p style={{ fontSize:10, color:D.muted, margin:'1px 0 0' }}>{desc}</p>
      </div>
    </div>
  )
}

// ─── Paj Prensipal ────────────────────────────────────────────
export default function MikwoKrediProfit() {
  const qc  = useQueryClient()
  const now = new Date()

  const [debutDate, setDebutDate] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
  const [finDate,   setFinDate]   = useState(new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0])
  const [modal,     setModal]     = useState(null)
  const [selDep,    setSelDep]    = useState(null)
  const [pageDep,   setPageDep]   = useState(1)

  const { data: profitData, isLoading: loadingProfit } = useQuery({
    queryKey: ['mikwo-profit', debutDate, finDate],
    queryFn:  () => api.get('/mikwo-profit', { params: { debutDate, finDate } }).then(r => r.data),
  })

  const { data: expData, isLoading: loadingExp } = useQuery({
    queryKey: ['mikwo-expenses', debutDate, finDate, pageDep],
    queryFn:  () => api.get('/mikwo-expenses', { params: { debutDate, finDate, page: pageDep, limit: 10 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const refresh = () => {
    qc.invalidateQueries(['mikwo-profit'])
    qc.invalidateQueries(['mikwo-expenses'])
  }

  const mutDelete = useMutation({
    mutationFn: (id) => api.delete(`/mikwo-expenses/${id}`),
    onSuccess: () => { toast.success('Depans efase.'); refresh() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const p          = profitData || {}
  const exps       = expData?.expenses || []
  const totalPages = Math.ceil((expData?.total||0) / 10) || 1

  const pwofiNèt = Number(p.pwofiNèt || 0)
  const revni    = p.revni  || {}
  const kout     = p.kout   || {}
  const kapital  = p.kapital || {}
  const stats    = p.stats  || {}

  // ✅ Vrè revni breakdown
  const totalEnteret  = Number(revni.enteret  || 0)
  const totalPenalite = Number(revni.penalite || 0)
  const totalFreKane  = Number(revni.freKane  || 0)
  const totalRevni    = Number(revni.total    || 0)

  return (
    <div style={{ padding:'14px 14px 80px', maxWidth:900, margin:'0 auto', fontFamily:'DM Sans, sans-serif', color:D.text }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:D.gold, margin:0, display:'flex', alignItems:'center', gap:8 }}>
            <BarChart2 size={20}/> Pwofi / Pèt — Mikwo Kredi
          </h1>
          <p style={{ fontSize:11, color:D.muted, margin:'3px 0 0' }}>Revni, depans ak nèt peryòd la</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input type="date" style={{ ...inputStyle, width:'auto', fontSize:12, colorScheme:'dark' }} value={debutDate} onChange={e => setDebutDate(e.target.value)}/>
            <span style={{ color:D.muted, fontSize:11 }}>→</span>
            <input type="date" style={{ ...inputStyle, width:'auto', fontSize:12, colorScheme:'dark' }} value={finDate} onChange={e => setFinDate(e.target.value)}/>
          </div>
          <button onClick={refresh} style={{ width:34, height:34, borderRadius:9, border:`1px solid ${D.cardBorder}`, background:D.card, color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={13}/>
          </button>
          <button onClick={() => { setSelDep(null); setModal('depans') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${D.red},#a00)`, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>
            <Plus size={14}/> Depans
          </button>
        </div>
      </div>

      {loadingProfit ? (
        <div style={{ textAlign:'center', padding:60, color:D.muted }}>Ap chaje...</div>
      ) : (
        <>
          {/* ── Bòks Pwofi/Pèt ── */}
          <div style={{ background: pwofiNèt >= 0 ? D.greenBg : D.redBg, border:`2px solid ${pwofiNèt>=0 ? D.green : D.red}40`, borderRadius:16, padding:'20px 22px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
            <div>
              <p style={{ fontSize:12, color:D.muted, fontWeight:700, textTransform:'uppercase', margin:'0 0 4px' }}>
                {pwofiNèt >= 0 ? '📈 Pwofi Nèt' : '📉 Pèt Nèt'} — {debutDate} → {finDate}
              </p>
              <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:32, color: pwofiNèt>=0 ? D.green : D.red, margin:0 }}>
                {pwofiNèt >= 0 ? '+' : ''}{fmt(pwofiNèt)} <span style={{ fontSize:16, fontWeight:400 }}>HTG</span>
              </p>
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:10, color:D.muted, margin:'0 0 2px', textTransform:'uppercase' }}>Revni Total</p>
                <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:16, color:D.green, margin:0 }}>+{fmt(totalRevni)}</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:10, color:D.muted, margin:'0 0 2px', textTransform:'uppercase' }}>Depans Total</p>
                <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:16, color:D.red, margin:0 }}>-{fmt(kout.total||0)}</p>
              </div>
            </div>
          </div>

          {/* ── 4 Kat Revni — BREAKDOWN REYÈL ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:20 }}>

            {/* ✅ Enterè Sèlman */}
            <KatRevni
              label="Enterè Kolekte"
              val={totalEnteret}
              color={D.green}
              icon={<DollarSign size={16}/>}
              desc="Enterè sèlman sou prè peye"
            />

            {/* ✅ Penalite Reta */}
            <KatRevni
              label="Penalite Reta"
              val={totalPenalite}
              color={D.orange}
              icon={<AlertTriangle size={16}/>}
              desc="Enterè kouru pou jou reta"
              badge={totalPenalite > 0 ? '⚠️' : null}
            />

            {/* ✅ Frè Kanè */}
            <KatRevni
              label={`Frè Kanè (${revni.nbrKontKane||0} kont)`}
              val={totalFreKane}
              color={D.gold}
              icon={<CreditCard size={16}/>}
              desc="250 HTG × kont kreye"
            />

            {/* Portfeuye */}
            <KatRevni
              label="Portfeuye Prè Aktif"
              val={stats.totalPortfeuye||0}
              color={D.blue}
              icon={<Wallet size={16}/>}
              desc={`${stats.nbrPreActif||0} prè aktif • ${stats.nbrKaneActif||0} kanè`}
            />
          </div>

          {/* ── Kat Depans ── */}
          <div style={{ background:D.card, borderRadius:12, padding:'12px 14px', border:`1px solid ${D.red}30`, display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${D.red}20`, display:'flex', alignItems:'center', justifyContent:'center', color:D.red, flexShrink:0 }}>
              <TrendingDown size={16}/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, color:D.muted, margin:'0 0 2px', textTransform:'uppercase', fontWeight:700 }}>Total Depans Operasyonèl</p>
              <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color:D.red, margin:0 }}>{fmt(kout.depans||0)} HTG</p>
              <p style={{ fontSize:10, color:D.muted, margin:'1px 0 0' }}>Loye, salè, lòt depans</p>
            </div>
            {/* Mini breakdown revni vs depans */}
            <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, color:D.muted }}>Enterè</span>
                <span style={{ fontSize:12, fontWeight:800, color:D.green, fontFamily:'monospace' }}>{fmt(totalEnteret)}</span>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, color:D.muted }}>Penalite</span>
                <span style={{ fontSize:12, fontWeight:800, color:D.orange, fontFamily:'monospace' }}>{fmt(totalPenalite)}</span>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, color:D.muted }}>Frè Kanè</span>
                <span style={{ fontSize:12, fontWeight:800, color:D.gold, fontFamily:'monospace' }}>{fmt(totalFreKane)}</span>
              </div>
            </div>
          </div>

          {/* ── Kapital ── */}
          <div style={{ background:D.card, borderRadius:12, padding:'12px 16px', border:`1px solid ${D.cardBorder}`, marginBottom:20 }}>
            <p style={{ fontSize:11, fontWeight:800, color:D.gold, textTransform:'uppercase', margin:'0 0 10px', letterSpacing:'0.07em' }}>💰 Kapital Operasyonèl</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[
                { label:'Enjekte',     val: kapital.enjekte  || 0, color:D.purple },
                { label:'Retounen',    val: kapital.retounen || 0, color:D.green  },
                { label:'Nèt Kapital', val: kapital.nèt      || 0, color:(kapital.nèt||0)>=0 ? D.green : D.red },
              ].map((item,i) => (
                <div key={i} style={{ background:`${item.color}10`, borderRadius:10, padding:'10px 12px', border:`1px solid ${item.color}20` }}>
                  <p style={{ fontSize:10, color:D.muted, margin:'0 0 2px', textTransform:'uppercase', fontWeight:700 }}>{item.label}</p>
                  <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:item.color, margin:0 }}>
                    {item.label==='Nèt Kapital' && (kapital.nèt||0)>=0 ? '+' : ''}{fmt(item.val)} G
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Lis Depans ── */}
          <div style={{ background:D.card, borderRadius:14, border:`1px solid ${D.cardBorder}`, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${D.cardBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:12, fontWeight:800, color:D.text, margin:0 }}>
                📋 Lis Depans — <span style={{ color:D.red }}>{fmt(expData?.totalMontant||0)} HTG</span>
              </p>
              <span style={{ fontSize:11, color:D.muted }}>{expData?.total||0} depans</span>
            </div>

            {loadingExp ? (
              <div style={{ padding:30, textAlign:'center', color:D.muted }}>Ap chaje...</div>
            ) : exps.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:D.muted }}>
                <TrendingDown size={30} style={{ opacity:0.2, display:'block', margin:'0 auto 10px' }}/>
                <p style={{ margin:0, fontSize:13 }}>Pa gen depans pou peryòd sa</p>
                <button onClick={() => setModal('depans')} style={{ marginTop:12, padding:'9px 16px', borderRadius:9, border:'none', background:`${D.red}20`, color:D.red, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                  + Ajoute Premye Depans
                </button>
              </div>
            ) : (
              <>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'rgba(255,255,255,0.03)', borderBottom:`1px solid ${D.cardBorder}` }}>
                      {['Dat','Titre','Kategori','Montan',''].map((h,i) => (
                        <th key={i} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:D.muted, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exps.map((d,i) => (
                      <tr key={d.id} style={{ borderBottom: i<exps.length-1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                        <td style={{ padding:'10px 14px', fontSize:12, color:D.muted }}>{fmtDate(d.date_depans)}</td>
                        <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:D.text }}>{d.titre}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:`${D.red}15`, color:D.red, fontWeight:700 }}>
                            {CAT_ICONS[d.categorie]} {d.categorie}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:14, fontWeight:900, color:D.red, fontFamily:'monospace' }}>{fmt(d.montant)} G</td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => { setSelDep(d); setModal('depans') }}
                              style={{ width:28, height:28, borderRadius:6, border:`1px solid ${D.cardBorder}`, background:'transparent', cursor:'pointer', color:D.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <Edit2 size={11}/>
                            </button>
                            <button onClick={() => { if(window.confirm('Efase depans sa?')) mutDelete.mutate(d.id) }}
                              style={{ width:28, height:28, borderRadius:6, border:'1px solid rgba(192,57,43,0.3)', background:D.redBg, cursor:'pointer', color:D.red, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div style={{ padding:'10px 14px', borderTop:`1px solid ${D.cardBorder}`, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <button onClick={() => setPageDep(p => Math.max(1,p-1))} disabled={pageDep===1} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${D.cardBorder}`, background:'transparent', cursor:'pointer', color:D.muted, display:'flex', alignItems:'center', justifyContent:'center' }}><ChevronLeft size={13}/></button>
                    <span style={{ fontSize:12, color:D.muted }}>Paj {pageDep}/{totalPages}</span>
                    <button onClick={() => setPageDep(p => Math.min(totalPages,p+1))} disabled={pageDep===totalPages} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${D.cardBorder}`, background:'transparent', cursor:'pointer', color:D.muted, display:'flex', alignItems:'center', justifyContent:'center' }}><ChevronRight size={13}/></button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {modal === 'depans' && (
        <ModalDepans dep={selDep} onClose={() => { setModal(null); setSelDep(null) }} onSuccess={refresh}/>
      )}
    </div>
  )
}