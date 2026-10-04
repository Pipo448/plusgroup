// src/pages/gym/GymMembersPage.jsx
// ✅ GYM FITNESS — Lis manm + ajoute nouvo manm (tèm klè, animasyon, responsive)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, X, Users, ChevronRight } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { useAuthStore } from '../../stores/authStore'

const G = {
  teal:'#14B8A6', ink:'#1a0533', muted:'#64748b',
  border:'rgba(0,0,0,0.08)', card:'#ffffff', bgSoft:'#f8fafc',
  shadow:'0 2px 14px rgba(20,20,43,0.06)', red:'#ef4444',
}

function AddMemberModal({ onClose }) {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const { register, handleSubmit, formState: { errors } } = useForm()

  const { data: plans } = useQuery({
    queryKey: ['gym-plans'],
    queryFn: () => gymAPI.getPlans().then(r => r.data.plans),
  })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.addMember(data),
    onSuccess: (res, variables) => {
      toast.success('Manm ajoute!')
      qc.invalidateQueries(['gym-members'])
      const plan = plans?.find(p => p.id === variables.planId)
      printGym(res.data.member, tenant, 'enskripsyon', {
        planName: plan?.name,
        amountPaid: variables.amountPaid,
      })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => {
    const payload = { ...data }
    if (!payload.planId) delete payload.planId
    else payload.amountPaid = Number(payload.amountPaid || 0)
    mutation.mutate(payload)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,5,51,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="gym-modal-pop" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:18, padding:24, width:'100%', maxWidth:440, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(20,20,43,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ color:G.ink, margin:0, fontSize:16, fontWeight:800 }}>Nouvo Manm</h3>
          <button type="button" onClick={onClose} style={{ background:G.bgSoft, border:'none', borderRadius:8, padding:6, color:G.muted, cursor:'pointer', display:'flex' }}><X size={16} /></button>
        </div>

        <label style={labelStyle}>Non Konplè</label>
        <input {...register('fullName', { required: true })} style={inputStyle} />
        {errors.fullName && <p style={errorStyle}>Non obligatwa.</p>}

        <label style={labelStyle}>Telefòn</label>
        <input {...register('phone')} style={inputStyle} />

        <label style={labelStyle}>Email (opsyonèl)</label>
        <input type="email" {...register('email')} style={inputStyle} />

        <label style={labelStyle}>Kontak Ijans</label>
        <input {...register('emergencyContact')} style={inputStyle} />

        <label style={labelStyle}>Telefòn Ijans</label>
        <input {...register('emergencyPhone')} style={inputStyle} />

        <div style={{ marginTop:18, paddingTop:14, borderTop:`1px solid ${G.border}` }}>
          <p style={{ color:G.muted, fontSize:12, margin:'0 0 10px', fontWeight:700 }}>Abònman inisyal (opsyonèl)</p>
          <label style={labelStyle}>Plan</label>
          <select {...register('planId')} style={inputStyle}>
            <option value="">— San plan (ajoute pita) —</option>
            {plans?.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {Number(p.priceHtg).toLocaleString('fr-FR')} HTG</option>
            ))}
          </select>
          <label style={labelStyle}>Montan Peye (HTG)</label>
          <input type="number" step="0.01" {...register('amountPaid')} style={inputStyle} />
        </div>

        <button type="submit" disabled={mutation.isPending}
          style={{ width:'100%', marginTop:20, padding:'13px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:14, boxShadow:'0 8px 20px rgba(20,184,166,0.3)' }}>
          {mutation.isPending ? 'Ap sove...' : 'Ajoute Manm'}
        </button>
      </form>
    </div>
  )
}

const labelStyle = { display:'block', color:G.muted, fontSize:12, fontWeight:600, margin:'12px 0 6px' }
const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.ink, fontSize:14, boxSizing:'border-box' }
const errorStyle = { color:G.red, fontSize:11, margin:'4px 0 0' }

const STATUS_COLORS = {
  active:    { bg:'rgba(34,197,94,0.12)',  color:'#16a34a', label:'Aktif' },
  expired:   { bg:'rgba(239,68,68,0.12)',  color:'#dc2626', label:'Ekspire' },
  cancelled: { bg:'rgba(100,116,139,0.12)',color:'#475569', label:'Anile' },
}

export default function GymMembersPage() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['gym-members', search],
    queryFn: () => gymAPI.getMembers({ search: search || undefined, limit: 50 }).then(r => r.data),
  })

  return (
    <div style={{ maxWidth:1000, margin:'0 auto' }}>
      <div className="gym-fadeup" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(20,184,166,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Users size={20} color={G.teal} />
          </div>
          <h1 style={{ margin:0, fontSize:19, fontWeight:800, color:G.ink }}>Manm Jim</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="gym-btn-prim"
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13, boxShadow:'0 6px 16px rgba(20,184,166,0.3)' }}>
          <Plus size={16} /> Nouvo Manm
        </button>
      </div>

      <div className="gym-fadeup" style={{ position:'relative', marginBottom:18, animationDelay:'60ms' }}>
        <Search size={16} color={G.muted} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Chèche pa non oswa telefòn..."
          style={{ width:'100%', padding:'12px 14px 12px 42px', borderRadius:12, border:`1px solid ${G.border}`, background:G.card, color:G.ink, fontSize:14, boxSizing:'border-box', boxShadow:G.shadow }}
        />
      </div>

      {isLoading ? (
        <p style={{ color:G.muted }}>Ap chaje...</p>
      ) : !data?.members?.length ? (
        <div className="gym-fadeup" style={{ textAlign:'center', padding:50, background:G.card, border:`1px dashed ${G.border}`, borderRadius:16, color:G.muted }}>
          Pa gen manm jwenn.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {data.members.map((m, i) => {
            const statusMeta = m.currentMembership ? STATUS_COLORS[m.currentMembership.status] || STATUS_COLORS.cancelled : null
            return (
              <Link key={m.id} to={`/app/gym/members/${m.id}`} className="gym-fadeup gym-row" style={{
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                padding:'14px 18px', borderRadius:14, background:G.card,
                border:`1px solid ${m.isActive ? G.border : 'rgba(239,68,68,0.25)'}`,
                textDecoration:'none', boxShadow:G.shadow, animationDelay:`${Math.min(i, 8) * 40}ms`,
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:G.ink, fontWeight:700, fontSize:14 }}>{m.fullName}</span>
                    {!m.isActive && <span style={{ fontSize:9, color:G.red, background:'rgba(239,68,68,0.1)', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>Inaktif</span>}
                  </div>
                  <p style={{ margin:'3px 0 0', color:G.muted, fontSize:12 }}>{m.phone || '—'}</p>
                </div>
                {statusMeta && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'5px 11px', borderRadius:9, background:statusMeta.bg, color:statusMeta.color, whiteSpace:'nowrap' }}>
                    {m.currentMembership.planName || 'Plan'} · {statusMeta.label}
                  </span>
                )}
                <ChevronRight size={16} color={G.muted} />
              </Link>
            )
          })}
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} />}

      <style>{`
        @keyframes gymFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gymPop { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .gym-fadeup { opacity:0; animation: gymFadeUp 0.4s ease forwards; }
        .gym-modal-pop { animation: gymPop 0.22s ease; }
        .gym-row { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .gym-row:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(20,20,43,0.09); }
        .gym-btn-prim { transition: transform 0.15s ease; }
        .gym-btn-prim:hover { transform: translateY(-2px); }
        @media (max-width: 520px) {
          .gym-row { padding:12px 14px !important; }
        }
      `}</style>
    </div>
  )
}