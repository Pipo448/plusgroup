// src/pages/enterprise/pre/PrePage.jsx — Paj prensipal (slim)
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import toast from 'react-hot-toast'
import {
  Plus, Search, Eye, Printer, ChevronLeft, ChevronRight,
  Users, Wallet, TrendingUp, Activity, AlertCircle, RefreshCw,
  DollarSign, Percent, ArrowDownCircle, PiggyBank, FileText, Lock,
  Bluetooth, BluetoothOff, Trash2, CheckCircle,
} from 'lucide-react'
import { D, fmt, fmtShort, SHARED_STYLES } from '../kaneShared.jsx'
import { STATUTS, PERIODES, PRE_STYLES } from './preConstants'
import { preAPI } from './preAPI'
import { usePrinter } from './preUtils'
import { Spinner, StatCard, StatutBadge } from './PreComponents'
import { ModalCreePre, ModalPaieman, ModalKapital, ModalRapoKesye, ModalDetailPre } from './PreModals'
import PinConfirmModal from '../../../components/PinConfirmModal'

export default function PrePage() {
  const qc      = useQueryClient()
  const printer = usePrinter()
  const { user } = useAuthStore()
  const isAdmin  = user?.role === 'admin'
  const [searchParams, setSearchParams] = useSearchParams()

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [modal,           setModal]           = useState(null)
  const [selPre,          setSelPre]          = useState(null)
  const [filterStatut,    setFilterStatut]    = useState(null)
  const [deleteTarget,    setDeleteTarget]    = useState(null) // ✅ prè k ap efase (PIN)
  const [deleting,        setDeleting]        = useState(false)
  const searchTimeout = useRef(null)
  const listRef        = useRef(null) // ✅ pou defile desann lè yo klike sou yon kat estatistik

  // ✅ Klike sou yon kat estatistik → aplike filtè a epi defile desann sou lis la
  const goToFilter = (statut) => {
    setFilterStatut(statut)
    setPage(1)
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = SHARED_STYLES + PRE_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  // ✅ Lyen dirèk soti nan yon notifikasyon (/app/pre?preId=xxx) — louvri
  // detay prè a otomatikman pou admin ka apwouve/rejte san chèche li nan lis la.
  useEffect(() => {
    const preIdFromUrl = searchParams.get('preId')
    if (preIdFromUrl) {
      setSelPre({ id: preIdFromUrl })
      setModal('detail')
      setSearchParams(prev => {
        const p = new URLSearchParams(prev)
        p.delete('preId')
        return p
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: kesData } = useQuery({
    queryKey: ['kes-status'],
    queryFn:  () => preAPI.checkKesFermen().then(r => r.data),
    refetchInterval: 30000, staleTime: 0, refetchOnWindowFocus: true,
  })
  const kesFemen = kesData?.kesFemen === true

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['pre-stats'],
    queryFn:  () => preAPI.getStats().then(r => r.data.stats),
    refetchInterval: 30000,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['pre-list', debouncedSearch, page, filterStatut],
    queryFn:  () => preAPI.getAll({ search: debouncedSearch||undefined, page, limit: 15, ...(filterStatut && { statut: filterStatut }) }).then(r => r.data),
    keepPreviousData: true,
  })

  const prets      = listData?.prets   || []
  const total      = listData?.total   || 0
  const totalPages = Math.ceil(total / 15) || 1

  const refresh     = () => { qc.invalidateQueries(['pre-list']); qc.invalidateQueries(['pre-stats']); if (selPre) qc.invalidateQueries(['pre-one', selPre.id]) }
  const openDetail  = (pre) => { setSelPre(pre); setModal('detail')  }
  const openPaieman = (pre) => { setSelPre(pre); setModal('paieman') }

  const handleSearch = (e) => {
    const val = e.target.value; setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  // ✅ Admin: efase prè — kounye a mande PIN
  const handleDeletePre = (e, pre) => {
    e.stopPropagation()
    setDeleteTarget(pre)
  }

  const confirmDeletePre = async (pin) => {
    setDeleting(true)
    try {
      await preAPI.deletePre(deleteTarget.id, pin)
      toast.success('✅ Prè efase!')
      setDeleteTarget(null)
      refresh()
    } finally { setDeleting(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>

      {kesFemen && (
        <div style={{ background:`${D.red}15`, border:`1px solid ${D.red}40`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <Lock size={16} style={{ color:D.red, flexShrink:0 }}/>
          <p style={{ fontSize:13, color:D.red, margin:0, fontWeight:700 }}>Kès fèmen jodi a — Okenn nouvo tranzaksyon p ap aksepte jiskaske demen.</p>
        </div>
      )}

      {/* Header */}
      <div className="ke-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:D.gold, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}>
            <DollarSign size={19}/> Mikwo Kredi — Prè
          </h1>
          <p style={{ fontSize:11, color:D.muted, margin:0 }}>Jere, suiv ak kolekte prè yo</p>
        </div>
        <div className="ke-header-right">
          {[57,80].map(mm => (
            <button key={mm} onClick={() => printer.setLargeur(mm)}
              style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${printer.largeur===mm ? D.gold+'60' : D.cardBorder}`, background:printer.largeur===mm ? D.goldDim : 'transparent', color:printer.largeur===mm ? D.gold : D.muted, cursor:'pointer', fontWeight:700, fontSize:11 }}>
              {mm}mm
            </button>
          ))}
          <button className="ke-btn" onClick={() => { refresh(); refetchStats() }}
            style={{ width:36, height:36, borderRadius:10, border:`1px solid ${D.cardBorder}`, background:D.card, color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14}/>
          </button>
          <button className="ke-btn" onClick={printer.connected ? printer.disconnect : printer.connect} disabled={printer.connecting}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 11px', borderRadius:10, border:'none', cursor:'pointer', background:printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)', color:printer.connected ? D.green : D.muted, fontWeight:700, fontSize:12 }}>
            {printer.connecting ? <Spinner size={13} color={D.muted}/> : printer.connected ? <Bluetooth size={14}/> : <BluetoothOff size={14}/>}
          </button>
          {!kesFemen && (
            <button className="ke-btn" onClick={() => setModal('rapo')}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 12px', borderRadius:10, border:`1px solid ${D.orange}30`, background:`${D.orange}10`, color:D.orange, cursor:'pointer', fontWeight:700, fontSize:12 }}>
              <FileText size={14}/> Fèmen Kès
            </button>
          )}
          {isAdmin && (
            <button className="ke-btn" onClick={() => setModal('kapital')}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 12px', borderRadius:10, border:`1px solid ${D.purple}30`, background:`${D.purple}10`, color:D.purple, cursor:'pointer', fontWeight:700, fontSize:12 }}>
              <PiggyBank size={14}/> Kapital
            </button>
          )}
          <button className="ke-btn" onClick={() => !kesFemen && setModal('create')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 15px', borderRadius:12, border:'none', cursor:kesFemen?'not-allowed':'pointer', background:kesFemen?'rgba(255,255,255,0.08)':D.goldBtn, color:kesFemen?D.muted:'#0a1222', fontWeight:800, fontSize:13, whiteSpace:'nowrap', opacity:kesFemen?0.5:1 }}>
            {kesFemen ? <Lock size={15}/> : <Plus size={15}/>} {kesFemen ? 'Kès Fèmen' : 'Nouvo Prè'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ke-stats-grid">
        <StatCard label="Total Prè"  value={statsData?.totalPrets  || 0}              icon={<Users size={17}/>}       color={D.gold}   onClick={() => goToFilter(null)}/>
        <StatCard label="An Atant"   value={statsData?.pretsAnAtant || 0}             icon={<Lock size={17}/>}        color={D.orange} onClick={() => goToFilter('attente')}/>
        <StatCard label="Prè Aktif"  value={statsData?.pretsActifs || 0}              icon={<Activity size={17}/>}    color={D.green}  onClick={() => goToFilter('actif')}/>
        <StatCard label="Prè Fini"   value={statsData?.pretsKlotire || 0}             icon={<CheckCircle size={17}/>} color={D.gold}   onClick={() => goToFilter('cloture')}/>
        <StatCard label="Pòtfèy"     value={`${fmt(statsData?.totalPortfeuye||0)} G`} icon={<Wallet size={17}/>}      color={D.blue} />
        <StatCard label="An Reta"    value={statsData?.totalEnReta || 0}              icon={<AlertCircle size={17}/>} color={D.red}    onClick={() => goToFilter('reta')}/>
      </div>

      {isAdmin && (
        <div style={{ background:D.card, borderRadius:12, padding:'12px 16px', border:`1px solid ${D.purple}30`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <PiggyBank size={16} style={{ color:D.purple }}/>
            <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>Kapital disponib pou prète:</span>
          </div>
          <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color:D.purple }}>{fmt(statsData?.kapitalDisponib||0)} HTG</span>
        </div>
      )}
{/* Aktivite Jodi a + Mwa a */}
<div style={{ background:D.card, borderRadius:14, padding:'12px 14px', border:`1px solid ${D.cardBorder}` }}>
  <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', color:D.gold, margin:'0 0 10px', letterSpacing:'0.08em' }}>● Aktivite Mwa a</p>
  <div className="ke-today-grid">
    <StatCard label="Dekèsman Jodi a"  value={`${fmt(statsData?.totalDesèmanJodi ||0)} G`} icon={<ArrowDownCircle size={17}/>} color={D.orange} highlight/>
    <StatCard label="Koleksyon Jodi a" value={`${fmt(statsData?.totalPaiemanJodi ||0)} G`} icon={<TrendingUp size={17}/>}      color={D.green}  highlight/>
    <StatCard label="Dekèsman Mwa a"   value={`${fmt(statsData?.totalDesèmanMwa ||0)} G`} icon={<ArrowDownCircle size={17}/>} color={D.orange} highlight/>
    <StatCard label="Koleksyon Mwa a"  value={`${fmt(statsData?.totalPaiemanMwa ||0)} G`} icon={<TrendingUp size={17}/>}      color={D.green}  highlight/>
    <StatCard label="Int. Kouru Total" value={`${fmt(statsData?.enterèKouruTotal||0)} G`} icon={<Percent size={17}/>}         color={D.red}    highlight/>
  </div>
</div>

      {/* ✅ PAR — Risk Pòtfèy */}
      {statsData?.par && statsData.par.total > 0 && (
        <div style={{ background:D.card, borderRadius:14, padding:'12px 14px', border:`1px solid ${D.cardBorder}` }}>
          <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', color:D.gold, margin:'0 0 10px', letterSpacing:'0.08em' }}>● Risk Pòtfèy (PAR)</p>
          <div className="ke-today-grid">
            {[
              { label:'PAR 30', ratio: statsData.par.par30Ratio, amt: statsData.par.par30 },
              { label:'PAR 60', ratio: statsData.par.par60Ratio, amt: statsData.par.par60 },
              { label:'PAR 90', ratio: statsData.par.par90Ratio, amt: statsData.par.par90 },
            ].map(item => {
              const color = item.ratio >= 10 ? D.red : item.ratio >= 5 ? D.orange : D.green
              return (
                <StatCard key={item.label} label={item.label} value={`${item.ratio}%`} sub={`${fmt(item.amt)} G`} icon={<AlertCircle size={17}/>} color={color} highlight/>
              )
            })}
          </div>
          <p style={{ fontSize:10, color:D.muted, margin:'8px 0 0' }}>
            PAR30 = pòsantaj pòtfèy ki gen omwen yon echeans an reta 30 jou oswa plis. Pòtfèy total ki an risk kalkile sou: {fmt(statsData.par.total)} HTG.
          </p>
        </div>
      )}

      {/* Rechèch + Filtre */}
      <div ref={listRef} style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', scrollMarginTop:16 }}>
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:160 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted, pointerEvents:'none' }}/>
          <input className="ke-input" style={{ paddingLeft:36, width:'100%', background:D.card, border:`1px solid ${D.cardBorder}`, borderRadius:10, padding:'10px 36px', color:D.text, fontSize:13, outline:'none', boxSizing:'border-box' }}
            placeholder="Chèche non, nimewo prè..." value={search} onChange={handleSearch}/>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
          {[{val:null,label:'Tout'},{val:'attente',label:'🟠 An Atant'},{val:'actif',label:'✅ Aktif'},{val:'reta',label:'🔴 An Reta'},{val:'cloture',label:'⚫ Klotire'},{val:'annule',label:'⛔ Rejte'}].map(f => (
            <button key={String(f.val)} className="ke-btn"
              onClick={() => { setFilterStatut(f.val); setPage(1) }}
              style={{ padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:700, border:`1px solid ${filterStatut===f.val ? D.gold+'60' : D.cardBorder}`, background:filterStatut===f.val ? D.goldDim : 'transparent', color:filterStatut===f.val ? D.gold : D.muted, cursor:'pointer', whiteSpace:'nowrap' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lis prè */}
      {isLoading ? (
        <div style={{ textAlign:'center', color:D.muted, padding:40, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <Spinner color={D.gold} size={18}/> Ap chaje...
        </div>
      ) : !prets.length ? (
        <div style={{ textAlign:'center', color:D.muted, padding:50, background:D.card, borderRadius:16, border:`1px dashed ${D.cardBorder}` }}>
          <DollarSign size={34} style={{ opacity:0.25, margin:'0 auto 10px', display:'block' }}/>
          <p style={{ fontSize:13, fontWeight:700, margin:0 }}>{search ? 'Pa jwenn rezilta' : 'Pa gen prè pou kounye a'}</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize:11, color:D.muted, margin:0 }}>{total} prè • paj {page}/{totalPages}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {prets.map(pre => {
              const resteAPayer    = Number(pre.totalDu||0) - Number(pre.totalPaye||0)
              const pctPaye        = pre.totalDu > 0 ? Math.min((Number(pre.totalPaye)/Number(pre.totalDu))*100, 100) : 0
              const cfg            = STATUTS[pre.statut] || STATUTS.attente
              const interetKouruPre = Number(pre.interetKouruTotal || 0)

              // ✅ Koulè bar pwogresyon: vèt (aktif/fini), jòn (an reta),
              // wouj (an reta plis pase 30 jou — menm sèy ak PAR30)
              const maxJouReta = Number(pre.maxJouReta || 0)
              let barColor = D.muted
              if (pre.statut === 'actif' || pre.statut === 'cloture') barColor = D.green
              else if (pre.statut === 'reta') barColor = maxJouReta >= 30 ? D.red : D.orange

              return (
                <div key={pre.id} className="pre-row" onClick={() => openDetail(pre)}
                  style={{ background:D.card, border:`1px solid ${pre.statut==='reta' ? D.red+'30' : D.cardBorder}`, borderRadius:14, padding:'12px 13px', cursor:'pointer', boxShadow:D.shadow, transition:'background 0.15s' }}>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start', minWidth:0, flex:1 }}>
                      <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:D.goldDim, border:`1px solid ${D.cardBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:D.gold }}>
                        {pre.clientNom?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <p style={{ fontFamily:'monospace', fontWeight:800, color:D.gold, fontSize:11, margin:0 }}>{pre.numeroPre}</p>
                          {pre.kontKaneEpayId && <span style={{ fontSize:9, color:D.green, fontWeight:700, background:D.greenBg, padding:'1px 6px', borderRadius:4 }}>🔗 Kanè</span>}
                          {interetKouruPre > 0 && <span style={{ fontSize:9, color:D.red, fontWeight:700, background:D.redBg, padding:'1px 6px', borderRadius:4 }}>⚠ kouru</span>}
                        </div>
                        <p style={{ fontSize:14, fontWeight:700, color:D.text, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pre.clientNom}</p>
                        <p style={{ fontSize:10, color:D.muted, margin:'2px 0 0' }}>{fmtShort(pre.createdAt)} • {pre.tauxInteret}% / mwa • {PERIODES.find(p=>p.value===pre.periode)?.label}</p>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontFamily:'monospace', fontSize:15, fontWeight:900, color:D.gold, margin:0 }}>{fmt(pre.montant)}</p>
                      <p style={{ fontSize:10, color:D.muted, margin:'1px 0 3px' }}>HTG</p>
                      <StatutBadge statut={pre.statut}/>
                    </div>
                  </div>

                  <div style={{ marginTop:10 }}>
                    <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:4 }}>
                      <div style={{ width:`${pctPaye}%`, height:'100%', background:barColor, borderRadius:2, transition:'width 0.3s' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:D.muted }}>
                      <span style={{ color:D.green }}>Peye: {fmt(pre.totalPaye||0)} HTG</span>
                      <span style={{ fontWeight:700, color:D.text }}>{Math.round(pctPaye)}%</span>
                      <span style={{ color:resteAPayer>0 ? cfg.color : D.green }}>{resteAPayer>0 ? `Rete: ${fmt(resteAPayer+interetKouruPre)} HTG` : '✅ Konplè'}</span>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:6, marginTop:10, paddingTop:10, borderTop:`1px solid rgba(201,168,76,0.1)` }}>
                    {pre.statut !== 'cloture' && pre.statut !== 'attente' && pre.statut !== 'annule' && (
                      <button className="ke-btn" onClick={e => { e.stopPropagation(); openPaieman(pre) }}
                        style={{ flex:1, padding:'8px 6px', borderRadius:8, border:'none', background:kesFemen?'rgba(255,255,255,0.05)':D.greenBg, color:kesFemen?D.muted:D.green, cursor:kesFemen?'not-allowed':'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                        {kesFemen ? <Lock size={12}/> : <ArrowDownCircle size={13}/>} Peman
                      </button>
                    )}
                    <button className="ke-btn" onClick={e => { e.stopPropagation(); openDetail(pre) }}
                      style={{ padding:'8px 13px', borderRadius:8, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Eye size={13}/>
                    </button>
                    <button className="ke-btn" onClick={e => { e.stopPropagation(); printer.printPre({ pre, echeances:[], tenant:null, type:'ouverture' }) }}
                      style={{ padding:'8px 13px', borderRadius:8, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Printer size={13}/>
                    </button>
                    {/* ✅ Admin: Bouton efase dirèkteman nan lis */}
                    {isAdmin && (
                      <button className="ke-btn" title="Admin: Efase prè" onClick={e => handleDeletePre(e, pre)}
                        style={{ padding:'8px 10px', borderRadius:8, border:'1px solid rgba(251,113,133,0.3)', background:'rgba(251,113,133,0.08)', color:'#FB7185', cursor:'pointer', display:'flex', alignItems:'center' }}>
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 2px' }}>
          <span style={{ fontSize:12, color:D.muted }}>{total} prè total</span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className="ke-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.cardBorder}`, background:D.card, color:D.muted, cursor:page===1?'default':'pointer', opacity:page===1?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={14}/>
            </button>
            <span style={{ fontSize:12, fontWeight:700, color:D.text, minWidth:50, textAlign:'center' }}>{page} / {totalPages}</span>
            <button className="ke-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.cardBorder}`, background:D.card, color:D.muted, cursor:page===totalPages?'default':'pointer', opacity:page===totalPages?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal==='create'  && <ModalCreePre   onClose={() => setModal(null)} onSuccess={refresh} printer={printer} kesFemen={kesFemen}/>}
      {modal==='kapital' && <ModalKapital   onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal==='rapo'    && <ModalRapoKesye onClose={() => setModal(null)} onKesFemen={() => qc.invalidateQueries(['kes-status'])}/>}
      {modal==='detail'  && selPre && <ModalDetailPre preId={selPre.id} onClose={() => setModal(null)} onPaieman={() => setModal('paieman')} printer={printer}/>}
      {modal==='paieman' && selPre && <ModalPaieman   pre={selPre} onClose={() => setModal(null)} onSuccess={refresh} printer={printer} kesFemen={kesFemen}/>}

      {/* ✅ PIN pou efase prè */}
      {deleteTarget && (
        <PinConfirmModal
          title="Efase Prè"
          message={`Efase prè ${deleteTarget.numeroPre} — ${deleteTarget.clientNom}? Aksyon sa IREVERSIB.`}
          loading={deleting}
          onConfirm={confirmDeletePre}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}