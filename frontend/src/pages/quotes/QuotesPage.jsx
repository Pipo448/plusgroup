// src/pages/quotes/QuotesPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { quoteAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, FileText, Eye, Edit2, Send, XCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914', goldDim:'rgba(201,168,76,0.12)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF', border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}
const fmt = (n) => Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:2})

const STATUS_MAP = {
  draft:     { label:'Bouyon',   color:'#64748B', bg:'rgba(100,116,139,0.08)' },
  sent:      { label:'Voye',     color:D.blue,    bg:D.blueDim  },
  accepted:  { label:'Aksepte',  color:D.success, bg:D.successBg },
  converted: { label:'Konvèti',  color:'#7C3AED', bg:'rgba(124,58,237,0.08)' },
  cancelled: { label:'Anile',    color:D.red,     bg:D.redDim   },
  expired:   { label:'Ekspire',  color:D.warning, bg:D.warningBg },
}

export default function QuotesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', search, status, page],
    queryFn: () => quoteAPI.getAll({ search, status, page, limit:15 }).then(r=>r.data),
    keepPreviousData: true,
  })

  const convertMutation = useMutation({
    mutationFn: (id) => quoteAPI.convert(id),
    onSuccess: (res) => { toast.success('Devis konvèti an facture!'); qc.invalidateQueries(['quotes']); navigate(`/invoices/${res.data.invoice.id}`) }
  })
  const cancelMutation = useMutation({
    mutationFn: (id) => quoteAPI.cancel(id),
    onSuccess: () => { toast.success('Devis anile.'); qc.invalidateQueries(['quotes']) }
  })
  const sendMutation = useMutation({
    mutationFn: (id) => quoteAPI.send(id),
    onSuccess: () => { toast.success('Devis voye.'); qc.invalidateQueries(['quotes']) }
  })

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.gold},${D.goldDk})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.gold}50` }}>
            <FileText size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Devis</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{data?.total||0} devis total</p>
          </div>
        </div>
        <Link to="/quotes/new" style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, textDecoration:'none',
          background:`linear-gradient(135deg,${D.blue},${D.blueLt})`,
          color:'#fff', fontWeight:800, fontSize:14, boxShadow:`0 4px 16px ${D.blue}45`,
          transition:'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${D.blue}50`}}
        onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=`0 4px 16px ${D.blue}45`}}
        >
          <Plus size={16}/> Nouvo Devis
        </Link>
      </div>

      {/* Filtres */}
      <div style={{ background:D.white, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', boxShadow:D.shadow }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input placeholder="Nimewo oswa kliyan..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
            style={{ width:'100%', padding:'9px 14px 9px 36px', borderRadius:10, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' }}
            onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}
          />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[{v:'',l:'Tout'}, ...Object.entries(STATUS_MAP).map(([k,s])=>({v:k,l:s.label}))].map(opt => (
            <button key={opt.v} onClick={()=>{setStatus(opt.v);setPage(1)}}
              style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s', background:status===opt.v?D.gold:'#F4F6FF', color:status===opt.v?'#fff':D.muted, border:`1.5px solid ${status===opt.v?D.gold:D.border}`, boxShadow:status===opt.v?`0 3px 10px ${D.gold}40`:'none' }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1fr 100px 90px 90px 100px', padding:'11px 20px', background:D.blueDim, borderBottom:`1px solid ${D.border}` }}>
          {['Nimewo','Kliyan','Total HTG','Statut','Dat','Ekspire','Aksyon'].map((h,i) => (
            <span key={i} style={{ color:D.blue, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', textAlign:i>=2&&i<=5?'center':'left' }}>{h}</span>
          ))}
        </div>

        {isLoading
          ? Array(5).fill(0).map((_,i) => (
              <div key={i} style={{ padding:'14px 20px', borderBottom:`1px solid ${D.border}`, display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1fr 100px 90px 90px 100px', gap:8 }}>
                {Array(7).fill(0).map((_,j) => <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6 }}/>)}
              </div>
            ))
          : !data?.quotes?.length
          ? <div style={{ padding:'60px 20px', textAlign:'center' }}>
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, borderRadius:20, background:D.goldDim, marginBottom:16 }}>
                <FileText size={32} color={D.gold}/>
              </div>
              <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:'0 0 16px' }}>Okenn devis jwenn</p>
              <Link to="/quotes/new" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:12, textDecoration:'none', fontSize:13, fontWeight:800, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', boxShadow:`0 4px 16px ${D.blue}40` }}>
                <Plus size={14}/> Kreye premye devis ou
              </Link>
            </div>
          : data.quotes.map((q, idx) => <QuoteRow key={q.id} q={q} idx={idx} D={D} fmt={fmt} STATUS_MAP={STATUS_MAP} convertMutation={convertMutation} cancelMutation={cancelMutation} sendMutation={sendMutation}/>)
        }
      </div>

      {/* Paginasyon */}
      {data?.pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
          <p style={{ color:D.muted, fontSize:13 }}>Paj <strong style={{color:D.text}}>{page}</strong> / {data.pages}</p>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} style={{ width:36,height:36,borderRadius:10,cursor:page<=1?'not-allowed':'pointer',background:page<=1?'#F4F6FF':D.blue,border:`1px solid ${page<=1?D.border:D.blue}`,color:page<=1?D.muted:'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronLeft size={16}/></button>
            <button disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)} style={{ width:36,height:36,borderRadius:10,cursor:page>=data.pages?'not-allowed':'pointer',background:page>=data.pages?'#F4F6FF':D.blue,border:`1px solid ${page>=data.pages?D.border:D.blue}`,color:page>=data.pages?D.muted:'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronRight size={16}/></button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuoteRow({ q, idx, D, fmt, STATUS_MAP, convertMutation, cancelMutation, sendMutation }) {
  const [hov, setHov] = useState(false)
  const s = STATUS_MAP[q.status] || STATUS_MAP.draft
  const isExpired = q.expiryDate && new Date(q.expiryDate) < new Date()

  const actionBtn = (onClick, icon, title, color) => (
    <button onClick={onClick} title={title} style={{
      width:28, height:28, borderRadius:7, border:`1px solid ${D.border}`, cursor:'pointer',
      background:hov?`${color}15`:'#F4F6FF', color, display:'flex', alignItems:'center', justifyContent:'center',
      transition:'all 0.15s', flexShrink:0,
    }}
    onMouseEnter={e=>{e.currentTarget.style.background=`${color}25`;e.currentTarget.style.borderColor=`${color}50`}}
    onMouseLeave={e=>{e.currentTarget.style.background=hov?`${color}15`:'#F4F6FF';e.currentTarget.style.borderColor=D.border}}
    >{icon}</button>
  )

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1fr 100px 90px 90px 100px', padding:'12px 20px', alignItems:'center', borderBottom:`1px solid ${D.border}`, background:hov?D.blueDim:idx%2===0?'#fff':'rgba(244,246,255,0.4)', transition:'background 0.15s' }}>
      <span style={{ fontFamily:'monospace', fontWeight:800, color:D.gold, fontSize:12 }}>{q.quoteNumber}</span>
      <span style={{ fontSize:13, fontWeight:600, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.client?.name || <span style={{color:D.muted,fontStyle:'italic'}}>San kliyan</span>}</span>
      <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text, fontSize:13, textAlign:'center' }}>{fmt(q.totalHtg)}</span>
      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:s.bg, color:s.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s.label}</span>
      </div>
      <span style={{ fontSize:11, color:D.muted, fontFamily:'monospace', textAlign:'center' }}>{format(new Date(q.issueDate),'dd/MM/yy')}</span>
      <span style={{ fontSize:11, fontFamily:'monospace', textAlign:'center', color:isExpired?D.red:D.muted }}>
        {q.expiryDate ? format(new Date(q.expiryDate),'dd/MM/yy') : '—'}
      </span>
      <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
        <Link to={`/quotes/${q.id}`} style={{ width:28,height:28,borderRadius:7,border:`1px solid ${D.border}`,background:hov?D.blueDim:'#F4F6FF',color:D.blue,display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',transition:'all 0.15s' }}><Eye size={13}/></Link>
        {['draft','sent'].includes(q.status) && actionBtn(()=>{}, <Edit2 size={12}/>, 'Modifye', D.blue)}
        {q.status==='draft' && actionBtn(()=>sendMutation.mutate(q.id), <Send size={12}/>, 'Voye', '#0284C7')}
        {['draft','sent','accepted'].includes(q.status) && actionBtn(()=>{ if(confirm('Konvèti devis sa an facture?')) convertMutation.mutate(q.id) }, <CheckCircle size={12}/>, 'Konvèti', D.success)}
        {!['converted','cancelled'].includes(q.status) && actionBtn(()=>{ if(confirm('Anile devis sa?')) cancelMutation.mutate(q.id) }, <XCircle size={12}/>, 'Anile', D.red)}
      </div>
    </div>
  )
}
