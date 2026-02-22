// src/pages/invoices/InvoicesPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { invoiceAPI } from '../../services/api'
import { Search, Receipt, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDim:'rgba(201,168,76,0.12)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}
const fmt = (n) => Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:2})

const STATUS_MAP = {
  unpaid:    { label:'Impaye', color:D.red,     bg:D.redDim },
  partial:   { label:'Pasyal', color:D.warning, bg:D.warningBg },
  paid:      { label:'Peye',   color:D.success, bg:D.successBg },
  cancelled: { label:'Anile',  color:'#666',    bg:'rgba(100,100,100,0.08)' },
  refunded:  { label:'Remèt',  color:D.blue,    bg:D.blueDim },
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, status, page],
    queryFn: () => invoiceAPI.getAll({ search, status, page, limit:15 }).then(r=>r.data),
    keepPreviousData: true,
  })

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
            <Receipt size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Facture</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{data?.total||0} facture total</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ background:D.white, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', boxShadow:D.shadow }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input placeholder="Nimewo oswa kliyan..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
            style={{ width:'100%', paddingLeft:36, padding:'9px 14px 9px 36px', borderRadius:10, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' }}
            onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}
          />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[{v:'',l:'Tout'}, ...Object.entries(STATUS_MAP).map(([k,s])=>({v:k,l:s.label}))].map(opt => (
            <button key={opt.v} onClick={()=>{setStatus(opt.v);setPage(1)}}
              style={{
                padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                background: status===opt.v ? D.blue : '#F4F6FF',
                color: status===opt.v ? '#fff' : D.muted,
                border:`1.5px solid ${status===opt.v ? D.blue : D.border}`,
                boxShadow: status===opt.v ? `0 3px 10px ${D.blue}35` : 'none',
              }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>
        {/* Header tablo */}
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 1fr 90px 80px 50px', padding:'11px 20px', background:D.blueDim, borderBottom:`1px solid ${D.border}` }}>
          {['Nimewo','Kliyan','Total HTG','Peye','Balans','Statut','Dat',''].map((h,i) => (
            <span key={i} style={{ color:D.blue, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', textAlign: i>=2&&i<7 ? 'center' : i===7 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>

        {isLoading
          ? Array(6).fill(0).map((_,i) => (
              <div key={i} style={{ padding:'14px 20px', borderBottom:`1px solid ${D.border}`, display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 1fr 90px 80px 50px', gap:8, alignItems:'center' }}>
                {Array(8).fill(0).map((_,j) => <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6, animation:'pulse 1.5s infinite' }}/>)}
              </div>
            ))
          : !data?.invoices?.length
          ? <div style={{ padding:'60px 20px', textAlign:'center' }}>
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, borderRadius:20, background:D.blueDim, marginBottom:16 }}>
                <Receipt size={32} color={D.blue}/>
              </div>
              <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:0 }}>Okenn facture jwenn</p>
            </div>
          : data.invoices.map((inv, idx) => {
              const s = STATUS_MAP[inv.status] || STATUS_MAP.unpaid
              return (
                <InvRow key={inv.id} inv={inv} idx={idx} s={s} D={D} fmt={fmt}/>
              )
            })
        }
      </div>

      {/* Paginasyon */}
      {data?.pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
          <p style={{ color:D.muted, fontSize:13 }}>Paj <strong style={{color:D.text}}>{page}</strong> / {data.pages} · <strong style={{color:D.text}}>{data.total}</strong> total</p>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} style={{ width:36, height:36, borderRadius:10, cursor:page<=1?'not-allowed':'pointer', background:page<=1?'#F4F6FF':D.blue, border:`1px solid ${page<=1?D.border:D.blue}`, color:page<=1?D.muted:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><ChevronLeft size={16}/></button>
            <button disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)} style={{ width:36, height:36, borderRadius:10, cursor:page>=data.pages?'not-allowed':'pointer', background:page>=data.pages?'#F4F6FF':D.blue, border:`1px solid ${page>=data.pages?D.border:D.blue}`, color:page>=data.pages?D.muted:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><ChevronRight size={16}/></button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}

function InvRow({ inv, idx, s, D, fmt }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 1fr 90px 80px 50px', padding:'13px 20px', alignItems:'center', borderBottom:`1px solid ${D.border}`, background:hov?D.blueDim:idx%2===0?'#fff':'rgba(244,246,255,0.4)', transition:'background 0.15s' }}>
      <span style={{ fontFamily:'monospace', fontWeight:800, color:D.blue, fontSize:12 }}>{inv.invoiceNumber}</span>
      <span style={{ fontSize:13, fontWeight:600, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.client?.name||'—'}</span>
      <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text, fontSize:13, textAlign:'center' }}>{fmt(inv.totalHtg)}</span>
      <span style={{ fontFamily:'monospace', color:D.success, fontWeight:700, fontSize:12, textAlign:'center' }}>{fmt(inv.amountPaidHtg)}</span>
      <span style={{ fontFamily:'monospace', color:Number(inv.balanceDueHtg)>0?D.red:D.muted, fontWeight:700, fontSize:12, textAlign:'center' }}>{fmt(inv.balanceDueHtg)}</span>
      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:s.bg, color:s.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s.label}</span>
      </div>
      <span style={{ fontSize:11, color:D.muted, fontFamily:'monospace', textAlign:'center' }}>{format(new Date(inv.issueDate),'dd/MM/yy')}</span>
      <div style={{ textAlign:'right' }}>
        <Link to={`/invoices/${inv.id}`} style={{ width:30, height:30, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', background:hov?`linear-gradient(135deg,${D.blue},${D.blueLt})`:D.blueDim, color:hov?'#fff':D.blue, textDecoration:'none', transition:'all 0.2s' }}>
          <Eye size={13}/>
        </Link>
      </div>
    </div>
  )
}
