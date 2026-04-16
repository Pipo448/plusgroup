// src/pages/enterprise/kane-epay/KaneEpayPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import toast from 'react-hot-toast'
import {
  Search, ArrowDownCircle, ArrowUpCircle, Eye,
  ChevronLeft, ChevronRight, Users, Wallet,
  TrendingUp, Activity, CreditCard, UserPlus,
  Bluetooth, BluetoothOff, RefreshCw, Lock, FileText, Trash2,
} from 'lucide-react'
import { D } from '../kaneShared.jsx'
import { fmt, fmtShort, usePrinter } from './kaneEpayUtils'
import { KANE_STYLES } from './kaneEpayConstants'
import { kaneAPI } from './kaneEpayAPI'
import { Spinner, StatCard } from './KaneEpayComponents'
import { ModalCreate, ModalTx, ModalDetail, ModalRapoKesyeKane } from './KaneEpayModals'

// ✅ Responsive styles ajoute
const EXTRA_STYLES = `
  .ke-acc-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 640px) { .ke-acc-grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 900px) { .ke-acc-grid { grid-template-columns: 1fr 1fr 1fr; } }
  .ke-page-pad { padding: 12px 10px 80px; }
  @media (min-width: 480px) { .ke-page-pad { padding: 14px 16px 80px; } }
  @media (min-width: 900px) { .ke-page-pad { padding: 16px 20px 80px; } }
`

const inputStyle = {
  width:'100%', padding:'11px 13px', borderRadius:10, fontSize:14,
  border:'1.5px solid rgba(255,255,255,0.09)', outline:'none',
  color: D.text, background:'#060f1e', transition:'border-color 0.15s',
  boxSizing:'border-box', fontFamily:'inherit',
}

export default function KaneEpayPage() {
  const qc      = useQueryClient()
  const printer = usePrinter()
  const { tenant, user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [modal,           setModal]           = useState(null)
  const [selAcc,          setSelAcc]          = useState(null)
  const [filterActive,    setFilterActive]    = useState(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = KANE_STYLES + EXTRA_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  // ✅ staleTime ajoute — evite refetch inutil
  const { data: kesData } = useQuery({
    queryKey:        ['kes-status'],
    queryFn:         () => kaneAPI.checkKesFemen().then(r => r.data),
    staleTime:       30000,
    refetchInterval: 30000,
  })
  const kesFemen = kesData?.kesFemen === true

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey:        ['kane-stats'],
    queryFn:         () => kaneAPI.getStats().then(r => r.data.stats),
    staleTime:       60000,   // ✅ 1 minit
    refetchInterval: 60000,   // ✅ 30s → 60s
  })

  const { data: listData, isLoading } = useQuery({
    queryKey:         ['kane-accounts', debouncedSearch, page, filterActive],
    queryFn:          () => kaneAPI.getAll({ search: debouncedSearch||undefined, page, limit:15, ...(filterActive!==null && { isActive: filterActive }) }).then(r => r.data),
    staleTime:        30000,   // ✅ pa refetch si done frèch
    keepPreviousData: true,
  })

  const accounts   = listData?.accounts || []
  const total      = listData?.total    || 0
  const totalPages = Math.ceil(total / 15) || 1

  const refresh = () => {
    qc.invalidateQueries(['kane-accounts'])
    qc.invalidateQueries(['kane-stats'])
    if (selAcc) qc.invalidateQueries(['kane-account', selAcc.id])
  }

  const openDetail  = (acc) => { setSelAcc(acc); setModal('detail')  }
  const openDepo    = (acc) => { if (kesFemen) return; setSelAcc(acc); setModal('depot')   }
  const openRetrait = (acc) => { if (kesFemen) return; setSelAcc(acc); setModal('retrait') }

  const handleSearch = (e) => {
    const val = e.target.value; setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  const handleDeleteAccount = (e, acc) => {
    e.stopPropagation()
    if (!window.confirm(`Efase kont ${acc.accountNumber} — ${acc.firstName} ${acc.lastName}?\n⚠️ IREVERSIB.`)) return
    kaneAPI.deleteAccount(acc.id)
      .then(() => { toast.success('✅ Kont efase!'); refresh() })
      .catch(err => toast.error(err.response?.data?.message || 'Erè.'))
  }

  const todayNet = (statsData?.todayDepositAmount||0) - (statsData?.todayWithdrawAmount||0)

  return (
    <div className="ke-page-pad" style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', maxWidth:960, margin:'0 auto' }}>

      {/* Bannè kès fèmen */}
      {kesFemen && (
        <div style={{ background:`${D.red}15`, border:`1px solid ${D.red}40`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <Lock size={16} style={{ color:D.red, flexShrink:0 }}/>
          <p style={{ fontSize:13, color:D.red, margin:0, fontWeight:700 }}>Kès fèmen jodi a — Okenn nouvo tranzaksyon p ap aksepte jiskaske demen.</p>
        </div>
      )}

      {/* Header */}
      <div className="ke-header">
        <div>
          <h1 className="ke-header-title" style={{ fontSize:19, fontWeight:900, color:D.gold, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}>
            <CreditCard size={19}/> Kanè Epay
          </h1>
          <p style={{ fontSize:11, color:D.muted, margin:0 }}>Kont depo ak retrè</p>
        </div>
        <div className="ke-header-right">
          <button className="ke-btn" onClick={() => { refresh(); refetchStats() }}
            style={{ width:36, height:36, borderRadius:10, border:`1px solid ${D.cardBorder}`, background:D.card, color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14}/>
          </button>
          <button className="ke-btn" onClick={printer.connected ? printer.disconnect : printer.connect} disabled={printer.connecting}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 11px', borderRadius:10, border:'none', cursor:'pointer', background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)', color: printer.connected ? D.green : D.muted, fontWeight:700, fontSize:12 }}>
            {printer.connecting ? <Spinner size={13} color={D.muted}/> : printer.connected ? <Bluetooth size={14}/> : <BluetoothOff size={14}/>}
          </button>
          {!kesFemen && (
            <button className="ke-btn" onClick={() => setModal('rapo')}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 12px', borderRadius:10, border:`1px solid ${D.orange}30`, background:`${D.orange}10`, color:D.orange, cursor:'pointer', fontWeight:700, fontSize:12 }}>
              <FileText size={14}/> <span style={{ display:'none' }} className="ke-btn-label">Fèmen Kès</span>
            </button>
          )}
          <button className="ke-btn" onClick={() => !kesFemen && setModal('create')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 15px', borderRadius:12, border:'none', cursor:kesFemen?'not-allowed':'pointer', background:kesFemen?'rgba(255,255,255,0.08)':D.goldBtn, color:kesFemen?D.muted:'#0a1222', fontWeight:800, fontSize:13, whiteSpace:'nowrap', opacity:kesFemen?0.5:1 }}>
            {kesFemen ? <Lock size={15}/> : <UserPlus size={15}/>} {kesFemen ? 'Kès Fèmen' : 'Nouvo Kont'}
          </button>
        </div>
      </div>

      {/* Stats grid — responsive */}
      <div className="ke-stats-grid">
        <StatCard label="Total Kont"   value={statsData?.totalAccounts   ||0}           icon={<Users size={17}/>}     color={D.gold}  />
        <StatCard label="Kont Aktif"   value={statsData?.activeAccounts  ||0}           icon={<Activity size={17}/>}  color={D.green} />
        <StatCard label="Total Balans" value={`${fmt(statsData?.totalBalance||0)} G`}   icon={<Wallet size={17}/>}    color={D.blue}  />
        <StatCard label="Kont Jodi a"  value={statsData?.todayNewAccounts||0}           icon={<UserPlus size={17}/>}  color="#8B5CF6" />
      </div>

      {/* Aktivite jodi a */}
      <div style={{ background:D.card, borderRadius:14, padding:'12px 14px', border:`1px solid ${D.cardBorder}` }}>
        <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', color:D.gold, margin:'0 0 10px', letterSpacing:'0.08em' }}>● Aktivite Jodi a</p>
        <div className="ke-today-grid">
          <StatCard label="Depo Jodi a"  value={`${fmt(statsData?.todayDepositAmount ||0)} G`} sub={`${statsData?.todayTransactions||0} tx`} icon={<ArrowDownCircle size={17}/>} color={D.green} highlight/>
          <StatCard label="Retrè Jodi a" value={`${fmt(statsData?.todayWithdrawAmount||0)} G`}                                                icon={<ArrowUpCircle size={17}/>}   color={D.red}   highlight/>
          <StatCard label="Nèt Jodi a"   value={`${todayNet>=0?'+':''}${fmt(todayNet)} G`}      sub="Depo − Retrè"                            icon={<TrendingUp size={17}/>}      color={todayNet>=0?D.green:D.red} highlight/>
        </div>
      </div>

      {/* Rechèch + Filtre */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 180px', minWidth:140 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted, pointerEvents:'none' }}/>
          <input className="ke-input" style={{ ...inputStyle, paddingLeft:36 }} placeholder="Chèche non, nimewo..." value={search} onChange={handleSearch}/>
        </div>
        <div style={{ display:'flex', gap:5, flexShrink:0 }}>
          {[{val:null,label:'Tout'},{val:true,label:'✅'},{val:false,label:'⛔'}].map(f => (
            <button key={String(f.val)} className="ke-tab-btn ke-btn" onClick={() => { setFilterActive(f.val); setPage(1) }}
              style={{ padding:'8px 10px', borderRadius:8, border:`1px solid ${filterActive===f.val ? D.gold+'60' : D.cardBorder}`, background:filterActive===f.val ? D.goldDim : 'transparent', color:filterActive===f.val ? D.gold : D.muted, cursor:'pointer', fontWeight:700, fontSize:12 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lis kont */}
      {isLoading ? (
        <div style={{ textAlign:'center', color:D.muted, padding:40, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <Spinner color={D.gold} size={18}/> Ap chaje...
        </div>
      ) : !accounts.length ? (
        <div style={{ textAlign:'center', color:D.muted, padding:50, background:D.card, borderRadius:16, border:`1px dashed ${D.cardBorder}` }}>
          <CreditCard size={34} style={{ opacity:0.25, margin:'0 auto 10px', display:'block' }}/>
          <p style={{ fontSize:13, fontWeight:700, margin:0 }}>{search ? 'Pa jwenn rezilta' : 'Pa gen kont Kanè Epay'}</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize:11, color:D.muted, margin:0 }}>{total} kont • paj {page}/{totalPages}</p>
          {/* ✅ Grid responsive: 1 kolòn mobil, 2 tablet, 3 desktop */}
          <div className="ke-acc-grid">
            {accounts.map(acc => (
              <div key={acc.id} className="ke-row" onClick={() => openDetail(acc)}
                style={{ background:D.card, border:`1px solid ${D.cardBorder}`, borderRadius:14, padding:'12px 13px', cursor:'pointer', boxShadow:D.shadow, transition:'background 0.15s', animation:'fadeUp 0.2s ease', display:'flex', flexDirection:'column' }}>
                {/* Top: avatar + info + balans */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:10 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start', minWidth:0, flex:1 }}>
                    {/* ✅ Pa montre foto nan lis — sèlman inisyal (foto retire nan backend) */}
                    <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:D.goldDim, border:`1px solid ${D.cardBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:D.gold }}>
                      {acc.firstName?.[0]?.toUpperCase()}{acc.lastName?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p className="ke-acc-num" style={{ fontFamily:'monospace', fontWeight:800, color:D.gold, fontSize:10, margin:'0 0 1px' }}>{acc.accountNumber}</p>
                      <p className="ke-acc-name" style={{ fontSize:13, fontWeight:700, color:D.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.firstName} {acc.lastName}</p>
                      {acc.phone && <p style={{ fontSize:11, color:D.muted, margin:'1px 0 0' }}>{acc.phone}</p>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontFamily:'monospace', fontSize:15, fontWeight:900, color:D.green, margin:0 }}>{fmt(acc.balance)}</p>
                    <p style={{ fontSize:9, color:D.muted, margin:'1px 0 0' }}>HTG</p>
                    {Number(acc.lockedAmount) > 0 && <p style={{ fontSize:9, color:D.orange, margin:'1px 0 0' }}>🔒 {fmt(acc.lockedAmount)}</p>}
                    <p style={{ fontSize:9, margin:'2px 0 0', fontWeight:700, color: acc.idPhotoUrl ? D.green : D.orange }}>{acc.idPhotoUrl ? '✅ KYC' : '⚠ KYC'}</p>
                  </div>
                </div>

                {/* Boutons aksyon */}
                <div className="ke-acc-row-btns" style={{ marginTop:'auto' }}>
                  <button className="ke-btn" onClick={e => { e.stopPropagation(); openDepo(acc) }}
                    style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none', background:kesFemen?'rgba(255,255,255,0.05)':D.greenBg, color:kesFemen?D.muted:D.green, cursor:kesFemen?'not-allowed':'pointer', fontWeight:700, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                    {kesFemen ? <Lock size={11}/> : <ArrowDownCircle size={12}/>} Depo
                  </button>
                  <button className="ke-btn" onClick={e => { e.stopPropagation(); openRetrait(acc) }}
                    style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none', background:kesFemen?'rgba(255,255,255,0.05)':D.redBg, color:kesFemen?D.muted:D.red, cursor:kesFemen?'not-allowed':'pointer', fontWeight:700, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                    {kesFemen ? <Lock size={11}/> : <ArrowUpCircle size={12}/>} Retrè
                  </button>
                  <button className="ke-btn" onClick={e => { e.stopPropagation(); openDetail(acc) }}
                    style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center' }}>
                    <Eye size={12}/>
                  </button>
                  {isAdmin && (
                    <button className="ke-btn" title="Efase kont" onClick={e => handleDeleteAccount(e, acc)}
                      style={{ padding:'7px 9px', borderRadius:8, border:'1px solid rgba(251,113,133,0.3)', background:'rgba(251,113,133,0.08)', color:'#FB7185', cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Trash2 size={12}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 2px' }}>
          <span style={{ fontSize:12, color:D.muted }}>{total} kont</span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className="ke-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.cardBorder}`, background:D.card, color:D.muted, cursor:page===1?'default':'pointer', opacity:page===1?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={14}/>
            </button>
            <span style={{ fontSize:12, fontWeight:700, color:D.text, minWidth:50, textAlign:'center' }}>{page} / {totalPages}</span>
            <button className="ke-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.cardBorder}`, background:D.card, color:D.muted, cursor:page===totalPages?'default':'pointer', opacity:page===totalPages?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal==='create' && <ModalCreate onClose={() => setModal(null)} onSuccess={refresh} printer={printer}/>}
      {modal==='rapo'   && <ModalRapoKesyeKane onClose={() => setModal(null)} onKesFemen={() => qc.invalidateQueries(['kes-status'])} statsKane={statsData}/>}
      {modal==='detail' && selAcc && <ModalDetail accountId={selAcc.id} onClose={() => setModal(null)} onDepo={() => !kesFemen && setModal('depot')} onRetrait={() => !kesFemen && setModal('retrait')} printer={printer}/>}
      {(modal==='depot'||modal==='retrait') && selAcc && !kesFemen && <ModalTx account={selAcc} type={modal} onClose={() => setModal(null)} onSuccess={refresh} printer={printer}/>}
    </div>
  )
}