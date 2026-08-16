// src/pages/enterprise/pre/CashFlowPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownCircle, ArrowUpCircle, Wallet, RefreshCw, DollarSign } from 'lucide-react'
import { D, fmt } from '../kaneShared.jsx'
import { preAPI } from './preAPI'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}
function firstOfMonthISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`
}

function FlowCard({ title, icon, antre, soti, nèt }) {
  return (
    <div style={{ background:D.card, borderRadius:14, padding:'16px 18px', border:`1px solid ${D.cardBorder}` }}>
      <p style={{ fontSize:12, fontWeight:800, textTransform:'uppercase', color:D.gold, margin:'0 0 14px', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:6 }}>
        {icon} {title}
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <div style={{ background:D.greenBg, borderRadius:10, padding:'10px 12px', border:`1px solid ${D.green}20` }}>
          <p style={{ fontSize:10, color:D.muted, margin:'0 0 3px', fontWeight:700, textTransform:'uppercase', display:'flex', alignItems:'center', gap:4 }}>
            <ArrowDownCircle size={11}/> Antre
          </p>
          <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color:D.green, margin:0 }}>{fmt(antre)} HTG</p>
        </div>
        <div style={{ background:D.redBg, borderRadius:10, padding:'10px 12px', border:`1px solid ${D.red}20` }}>
          <p style={{ fontSize:10, color:D.muted, margin:'0 0 3px', fontWeight:700, textTransform:'uppercase', display:'flex', alignItems:'center', gap:4 }}>
            <ArrowUpCircle size={11}/> Soti
          </p>
          <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color:D.red, margin:0 }}>{fmt(soti)} HTG</p>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:`1px solid ${D.cardBorder}` }}>
        <span style={{ fontSize:12, fontWeight:700, color:D.muted }}>Nèt:</span>
        <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color: nèt >= 0 ? D.green : D.red }}>
          {nèt >= 0 ? '+' : ''}{fmt(nèt)} HTG
        </span>
      </div>
    </div>
  )
}

export default function CashFlowPage() {
  const [debutDate, setDebutDate] = useState(firstOfMonthISO())
  const [finDate, setFinDate]     = useState(todayISO())

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pre-cash-flow', debutDate, finDate],
    queryFn:  () => preAPI.cashFlow({ debutDate, finDate }).then(r => r.data),
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>

      <div className="ke-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:D.gold, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}>
            <DollarSign size={19}/> Kòb Antre / Soti
          </h1>
          <p style={{ fontSize:11, color:D.muted, margin:0 }}>Mikwo Kredi (Prè) + Kanè Epay — separe ak global</p>
        </div>
      </div>

      {/* Selektè peryòd */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', background:D.card, borderRadius:12, padding:'10px 14px', border:`1px solid ${D.cardBorder}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:D.muted, fontWeight:700 }}>Depi</span>
          <input type="date" className="ke-input" value={debutDate} onChange={e => setDebutDate(e.target.value)}
            style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${D.cardBorder}`, borderRadius:8, padding:'7px 10px', color:D.text, fontSize:12, colorScheme:'dark' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:D.muted, fontWeight:700 }}>Jiska</span>
          <input type="date" className="ke-input" value={finDate} onChange={e => setFinDate(e.target.value)}
            style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${D.cardBorder}`, borderRadius:8, padding:'7px 10px', color:D.text, fontSize:12, colorScheme:'dark' }}/>
        </div>
        <button className="ke-btn" onClick={() => refetch()} disabled={isFetching}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:8, border:`1px solid ${D.gold}30`, background:D.goldDim, color:D.gold, cursor:'pointer', fontWeight:700, fontSize:12 }}>
          <RefreshCw size={13}/> {isFetching ? 'Ap chaje...' : 'Rafrechi'}
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign:'center', color:D.muted, padding:40 }}>Ap chaje...</div>
      ) : !data ? (
        <div style={{ textAlign:'center', color:D.muted, padding:40 }}>Pa gen done.</div>
      ) : (
        <>
          <FlowCard title="Mikwo Kredi (Prè)" icon={<Wallet size={14}/>} antre={data.pre.antre} soti={data.pre.soti} nèt={data.pre.nèt}/>
          <FlowCard title="Kanè Epay" icon={<Wallet size={14}/>} antre={data.kaneEpay.antre} soti={data.kaneEpay.soti} nèt={data.kaneEpay.nèt}/>

          {/* Global — mete aksan sou li */}
          <div style={{ background:D.goldBtn, borderRadius:14, padding:'18px 20px', color:'#0a1222' }}>
            <p style={{ fontSize:12, fontWeight:900, textTransform:'uppercase', margin:'0 0 14px', letterSpacing:'0.06em', opacity:0.85 }}>
              ● Global — Tou De Modil Ansanm
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
              <div>
                <p style={{ fontSize:10, fontWeight:700, opacity:0.7, margin:'0 0 3px', textTransform:'uppercase' }}>Antre</p>
                <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:18, margin:0 }}>{fmt(data.global.antre)}</p>
              </div>
              <div>
                <p style={{ fontSize:10, fontWeight:700, opacity:0.7, margin:'0 0 3px', textTransform:'uppercase' }}>Soti</p>
                <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:18, margin:0 }}>{fmt(data.global.soti)}</p>
              </div>
              <div>
                <p style={{ fontSize:10, fontWeight:700, opacity:0.7, margin:'0 0 3px', textTransform:'uppercase' }}>Nèt</p>
                <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:18, margin:0 }}>
                  {data.global.nèt >= 0 ? '+' : ''}{fmt(data.global.nèt)}
                </p>
              </div>
            </div>
          </div>

          <p style={{ fontSize:10, color:D.muted, margin:0, textAlign:'center' }}>
            Peryòd: {data.periode.debutDate} → {data.periode.finDate}. "Soti" pou Prè baze sou dat APWOBASYON an (lè lajan reyèlman dekèse), pa dat demand lan.
          </p>
        </>
      )}
    </div>
  )
}
