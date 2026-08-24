// src/pages/kes-sesyon/KesSesyonPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kesSesyonAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { printReport } from '../../utils/printReport'
import toast from 'react-hot-toast'
import { ArrowLeft, Wallet, Printer, Lock, Unlock, History } from 'lucide-react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)',
  gold:'#C9A84C', orange:'#FF6B00', orangeLt:'#FF8C33',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.18)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', red:'#C0392B',
  shadow:'0 2px 14px rgba(27,42,143,0.06)',
  heroGrad:'linear-gradient(115deg,#0F1A5C 0%,#1B2A8F 55%,#2D3FBF 100%)',
  shadowLift:'0 10px 24px rgba(27,42,143,0.16)',
}
const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid rgba(27,42,143,0.20)`, outline:'none',
  fontSize:13, color:D.text, background:'#FFFFFF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
}
const inpMoney = { ...inp, border:`1.5px solid rgba(27,42,143,0.28)`, fontFamily:'monospace', fontWeight:800, color:D.blueDk, background:'#F7F8FF' }
const label = (txt) => (
  <label style={{ display:'block', fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{txt}</label>
)
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function KesSesyonPage() {
  const navigate = useNavigate()
  const { tenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const [fonOuveti, setFonOuveti] = useState('')
  const [fonFemen, setFonFemen] = useState('')
  const [notes, setNotes] = useState('')
  const [dernyeSesyon, setDernyeSesyon] = useState(null)

  const { data: aktifData } = useQuery({ queryKey: ['kes-sesyon-aktif'], queryFn: () => kesSesyonAPI.getAktif() })
  const sesyonAktif = aktifData?.data?.sesyon || null

  const { data: histData } = useQuery({ queryKey: ['kes-sesyon-list'], queryFn: () => kesSesyonAPI.getAll({ limit: 30 }), enabled: isAdmin })
  const historik = histData?.data?.sesyon || []

  const louvriMutation = useMutation({
    mutationFn: () => kesSesyonAPI.louvri({ fonKesOuveti: Number(fonOuveti), notes }),
    onSuccess: () => { toast.success('Sesyon kès louvri.'); setFonOuveti(''); setNotes(''); qc.invalidateQueries({ queryKey: ['kes-sesyon-aktif'] }) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan louvri sesyon an.'),
  })

  const femenMutation = useMutation({
    mutationFn: () => kesSesyonAPI.femen(sesyonAktif.id, { fonKesFemen: Number(fonFemen), notes }),
    onSuccess: (res) => {
      toast.success('Sesyon fèmen.')
      setDernyeSesyon(res.data.sesyon)
      setFonFemen(''); setNotes('')
      qc.invalidateQueries({ queryKey: ['kes-sesyon-aktif'] })
      qc.invalidateQueries({ queryKey: ['kes-sesyon-list'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan fèmen sesyon an.'),
  })

  const ekaColor = (eka) => eka > 0 ? D.success : eka < 0 ? D.red : D.muted
  const ekaLabel = (eka) => eka > 0 ? 'Siplis' : eka < 0 ? 'Manko' : 'Ekzat'

  const printSesyon = (s) => {
    const eka = Number(s.eka || 0)
    printReport({
      tenantName: tenant?.name,
      title: 'Fich Sesyon Kès',
      subtitle: s.user?.fullName || '',
      meta: [
        { label: 'Louvri', value: fmtDate(s.opened_at) },
        { label: 'Fèmen', value: fmtDate(s.closed_at) },
      ],
      rows: [
        { label: 'Fon Kès Inisyal', value: `${fmt(s.fon_kes_ouveti)} HTG` },
        { label: 'Vant Kach', value: `${fmt(s.vant_kach)} HTG` },
        { label: 'Total Atann', value: `${fmt(s.atann)} HTG`, strong: true },
        { label: 'Kantite Konte', value: `${fmt(s.fon_kes_femen)} HTG`, strong: true },
        { label: ekaLabel(eka), value: `${eka > 0 ? '+' : ''}${fmt(eka)} HTG`, strong: true, color: eka > 0 ? 'color-green' : eka < 0 ? 'color-red' : '' },
      ],
    })
  }

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'24px' }}>
      <div style={{ position:'relative', overflow:'hidden', background: D.heroGrad, borderRadius:22, padding:'26px 30px', marginBottom:26, boxShadow:'0 14px 34px rgba(15,26,92,0.28)' }}>
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.9, pointerEvents:'none' }}>
          <path d="M -20 150 C 140 60, 340 210, 620 70" stroke={D.orange} strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 180 C 160 100, 360 240, 620 110" stroke={D.gold} strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={() => navigate(-1)} style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.22)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <ArrowLeft size={17}/>
          </button>
          <div style={{ width:50, height:50, borderRadius:14, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 18px rgba(255,107,0,0.35)' }}>
            <Wallet size={23} color="#fff"/>
          </div>
          <div>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:10, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', margin:'0 0 3px' }}>{tenant?.name || 'Kès'}</p>
            <h1 style={{ color:'#fff', fontSize:25, fontWeight:900, margin:0 }}>Sesyon Kès</h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize:13, margin:'3px 0 0' }}>Louvri/fèmen sesyon ou, kontwole kòb ou</p>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Sesyon aktyèl */}
        <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow }}>
          {!sesyonAktif ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center' }}><Unlock size={14} color={D.blue}/></div>
                <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Louvri Sesyon</h3>
              </div>
              <div style={{ maxWidth:340 }}>
                <div style={{ marginBottom:12 }}>{label('Fon Kès Inisyal (HTG) *')}<input type="number" step="0.01" min="0" style={inpMoney} value={fonOuveti} onChange={e => setFonOuveti(e.target.value)} placeholder="0.00" autoFocus/></div>
                <div style={{ marginBottom:14 }}>{label('Nòt (opsyonèl)')}<input style={inp} value={notes} onChange={e => setNotes(e.target.value)}/></div>
                <button onClick={() => fonOuveti !== '' ? louvriMutation.mutate() : toast.error('Antre fon kès inisyal la.')} disabled={louvriMutation.isPending}
                  style={{ padding:'12px 20px', borderRadius:12, border:'none', background:D.success, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift }}>
                  {louvriMutation.isPending ? 'N ap louvri...' : '🔓 Louvri Sesyon'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:'rgba(5,150,105,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}><Lock size={14} color={D.success}/></div>
                  <div>
                    <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Sesyon Louvri</h3>
                    <p style={{ fontSize:11, color:D.muted, margin:'2px 0 0' }}>Depi {fmtDate(sesyonAktif.opened_at)}</p>
                  </div>
                </div>
                <span style={{ padding:'5px 12px', borderRadius:99, background:'rgba(5,150,105,0.1)', color:D.success, fontSize:11, fontWeight:800 }}>● Aktif</span>
              </div>
              <div style={{ padding:'12px 16px', borderRadius:12, background:D.blueDim, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase' }}>Fon Kès Inisyal</span>
                <span style={{ fontSize:15, fontWeight:900, color:D.blueDk, fontFamily:'monospace' }}>{fmt(sesyonAktif.fon_kes_ouveti)} HTG</span>
              </div>
              <div style={{ maxWidth:340 }}>
                <div style={{ marginBottom:12 }}>{label('Kantite Kòb ou Konte nan Tiwa a (HTG) *')}<input type="number" step="0.01" min="0" style={inpMoney} value={fonFemen} onChange={e => setFonFemen(e.target.value)} placeholder="0.00" autoFocus/></div>
                <div style={{ marginBottom:14 }}>{label('Nòt (opsyonèl)')}<input style={inp} value={notes} onChange={e => setNotes(e.target.value)}/></div>
                <button onClick={() => fonFemen !== '' ? femenMutation.mutate() : toast.error('Antre kantite kòb ou konte a.')} disabled={femenMutation.isPending}
                  style={{ padding:'12px 20px', borderRadius:12, border:'none', background:D.orange, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift }}>
                  {femenMutation.isPending ? 'N ap fèmen...' : '🔒 Fèmen Sesyon'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Rezilta dènye sesyon fèmen */}
        {dernyeSesyon && (
          <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow, border:`2px solid ${ekaColor(Number(dernyeSesyon.eka))}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Rezilta Sesyon an</h3>
              <button onClick={() => printSesyon(dernyeSesyon)} style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${D.blue}`, background:'#fff', color:D.blue, fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Printer size={14}/> Enprime Fich
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><p style={{ fontSize:10, color:D.muted, fontWeight:800, textTransform:'uppercase', margin:'0 0 3px' }}>Vant Kach</p><p style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', margin:0 }}>{fmt(dernyeSesyon.vant_kach)}</p></div>
              <div><p style={{ fontSize:10, color:D.muted, fontWeight:800, textTransform:'uppercase', margin:'0 0 3px' }}>Total Atann</p><p style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', margin:0 }}>{fmt(dernyeSesyon.atann)}</p></div>
              <div><p style={{ fontSize:10, color:D.muted, fontWeight:800, textTransform:'uppercase', margin:'0 0 3px' }}>Kantite Konte</p><p style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', margin:0 }}>{fmt(dernyeSesyon.fon_kes_femen)}</p></div>
              <div>
                <p style={{ fontSize:10, color:D.muted, fontWeight:800, textTransform:'uppercase', margin:'0 0 3px' }}>{ekaLabel(Number(dernyeSesyon.eka))}</p>
                <p style={{ fontSize:18, fontWeight:900, fontFamily:'monospace', margin:0, color:ekaColor(Number(dernyeSesyon.eka)) }}>
                  {Number(dernyeSesyon.eka) > 0 ? '+' : ''}{fmt(dernyeSesyon.eka)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Istorik — admin sèlman */}
        {isAdmin && (
          <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center' }}><History size={14} color={D.blue}/></div>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Istorik Sesyon (Tout Kesye)</h3>
            </div>
            {historik.length === 0 ? (
              <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen sesyon anrejistre ankò.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {historik.map(s => (
                  <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:12, border:`1px solid ${D.border}` }}>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontWeight:800, fontSize:13, color:D.text, margin:'0 0 2px' }}>{s.user?.fullName || '—'}</p>
                      <p style={{ fontSize:11, color:D.muted, margin:0 }}>{fmtDate(s.opened_at)} {s.status === 'femen' ? `→ ${fmtDate(s.closed_at)}` : '· En kou'}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      {s.status === 'femen' ? (
                        <span style={{ fontWeight:900, fontSize:13, fontFamily:'monospace', color:ekaColor(Number(s.eka)) }}>
                          {Number(s.eka) > 0 ? '+' : ''}{fmt(s.eka)} HTG
                        </span>
                      ) : (
                        <span style={{ fontSize:11, fontWeight:800, color:D.success }}>● Aktif</span>
                      )}
                      {s.status === 'femen' && (
                        <button onClick={() => printSesyon(s)} style={{ background:D.blueDim, border:'none', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', color:D.blue, cursor:'pointer' }}>
                          <Printer size={13}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
