// src/pages/gym/GymMemberDetail.jsx
// ✅ GYM FITNESS — Pwofil manm (istorik abònman, peman, check-in) — tèm klè, animasyon, responsive
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, User, Phone, Mail, Plus, X, CreditCard, Wallet, LogIn, Ban, Printer } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { useAuthStore } from '../../stores/authStore'

const G = {
  teal:'#14B8A6', ink:'#1a0533', muted:'#64748b',
  border:'rgba(0,0,0,0.08)', card:'#ffffff', bgSoft:'#f8fafc',
  shadow:'0 2px 14px rgba(20,20,43,0.06)', red:'#ef4444', amber:'#d97706',
}

const STATUS_COLORS = {
  active:    { bg:'rgba(34,197,94,0.12)',  color:'#16a34a', label:'Aktif' },
  expired:   { bg:'rgba(239,68,68,0.12)',  color:'#dc2626', label:'Ekspire' },
  cancelled: { bg:'rgba(100,116,139,0.12)',color:'#475569', label:'Anile' },
}

const labelStyle = { display:'block', color:G.muted, fontSize:12, fontWeight:600, margin:'12px 0 6px' }
const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.ink, fontSize:14, boxSizing:'border-box' }

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,5,51,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
      <div className="gym-modal-pop" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:18, padding:24, width:'100%', maxWidth:420, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(20,20,43,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ color:G.ink, margin:0, fontSize:16, fontWeight:800 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background:G.bgSoft, border:'none', borderRadius:8, padding:6, color:G.muted, cursor:'pointer', display:'flex' }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function NewMembershipModal({ memberId, member, onClose }) {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const { register, handleSubmit } = useForm()
  const { data: plans } = useQuery({ queryKey:['gym-plans'], queryFn: () => gymAPI.getPlans().then(r => r.data.plans) })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.createMembership(memberId, data),
    onSuccess: (res, variables) => {
      toast.success('Abònman kreye!')
      qc.invalidateQueries(['gym-member', memberId])
      qc.invalidateQueries(['gym-memberships', memberId])
      const plan = plans?.find(p => p.id === variables.planId)
      printGym(member, tenant, 'plan', {
        planName: plan?.name,
        amountPaid: variables.amountPaid,
        method: variables.method,
        startDate: res.data.membership?.startDate || variables.startDate,
        endDate: res.data.membership?.endDate,
      })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, amountPaid: Number(data.amountPaid || 0) })

  return (
    <Modal title="Nouvo Abònman" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label style={labelStyle}>Plan</label>
        <select {...register('planId', { required:true })} style={inputStyle}>
          {plans?.map(p => <option key={p.id} value={p.id}>{p.name} — {Number(p.priceHtg).toLocaleString('fr-FR')} HTG</option>)}
        </select>
        <label style={labelStyle}>Dat Kòmansman</label>
        <input type="date" defaultValue={new Date().toISOString().split('T')[0]} {...register('startDate', { required:true })} style={inputStyle} />
        <label style={labelStyle}>Montan Peye (HTG)</label>
        <input type="number" step="0.01" {...register('amountPaid')} style={inputStyle} />
        <label style={labelStyle}>Metòd</label>
        <select {...register('method')} style={inputStyle}>
          <option value="cash">Kach</option>
          <option value="moncash">MonCash</option>
          <option value="natcash">NatCash</option>
          <option value="card">Kat</option>
          <option value="bank">Bank</option>
        </select>
        <button type="submit" disabled={mutation.isPending}
          style={{ width:'100%', marginTop:20, padding:'13px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:14, boxShadow:'0 8px 20px rgba(20,184,166,0.3)' }}>
          {mutation.isPending ? 'Ap sove...' : 'Kreye Abònman'}
        </button>
      </form>
    </Modal>
  )
}

function NewPaymentModal({ memberId, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({ defaultValues:{ type:'manual', method:'cash' } })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.addPayment(memberId, data),
    onSuccess: () => {
      toast.success('Peman anrejistre!')
      qc.invalidateQueries(['gym-payments', memberId])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, amountHtg: Number(data.amountHtg) })

  return (
    <Modal title="Nouvo Peman" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label style={labelStyle}>Montan (HTG)</label>
        <input type="number" step="0.01" {...register('amountHtg', { required:true, min:0 })} style={inputStyle} />
        <label style={labelStyle}>Metòd</label>
        <select {...register('method')} style={inputStyle}>
          <option value="cash">Kach</option>
          <option value="moncash">MonCash</option>
          <option value="natcash">NatCash</option>
          <option value="card">Kat</option>
          <option value="bank">Bank</option>
        </select>
        <label style={labelStyle}>Nòt (opsyonèl)</label>
        <input {...register('notes')} style={inputStyle} />
        <button type="submit" disabled={mutation.isPending}
          style={{ width:'100%', marginTop:20, padding:'13px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:14, boxShadow:'0 8px 20px rgba(20,184,166,0.3)' }}>
          {mutation.isPending ? 'Ap sove...' : 'Anrejistre Peman'}
        </button>
      </form>
    </Modal>
  )
}

function PrintButton({ onClick, title = 'Enprime resi' }) {
  return (
    <button onClick={onClick} title={title} style={{
      background:'rgba(20,184,166,0.1)', border:'none', borderRadius:8, padding:6,
      color:G.teal, cursor:'pointer', display:'flex', flexShrink:0,
    }}>
      <Printer size={14} />
    </button>
  )
}

function SectionCard({ icon:Icon, title, color, children, delay }) {
  return (
    <div className="gym-fadeup" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:18, boxShadow:G.shadow, animationDelay:`${delay}ms` }}>
      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
        <Icon size={16} color={color} />
        <h3 style={{ margin:0, fontSize:13, fontWeight:800, color:G.ink, textTransform:'uppercase', letterSpacing:'0.03em' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function GymMemberDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const [showMembership, setShowMembership] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  const { data: member, isLoading } = useQuery({
    queryKey: ['gym-member', id],
    queryFn: () => gymAPI.getMember(id).then(r => r.data.member),
  })
  const { data: memberships } = useQuery({
    queryKey: ['gym-memberships', id],
    queryFn: () => gymAPI.getMemberships(id).then(r => r.data.memberships),
  })
  const { data: payments } = useQuery({
    queryKey: ['gym-payments', id],
    queryFn: () => gymAPI.getPayments({ memberId: id, limit: 20 }).then(r => r.data.payments),
  })
  const { data: checkIns } = useQuery({
    queryKey: ['gym-checkins', id],
    queryFn: () => gymAPI.getCheckIns({ memberId: id, limit: 10 }).then(r => r.data.checkIns),
  })

  const cancelMutation = useMutation({
    mutationFn: (membershipId) => gymAPI.cancelMembership(membershipId),
    onSuccess: () => { toast.success('Abònman anile.'); qc.invalidateQueries(['gym-memberships', id]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  if (isLoading) return <p style={{ color:G.muted }}>Ap chaje...</p>
  if (!member) return <p style={{ color:G.red }}>Manm pa jwenn.</p>

  return (
    <div style={{ maxWidth:800, margin:'0 auto' }}>
      <Link to="/app/gym/members" className="gym-fadeup" style={{ display:'inline-flex', alignItems:'center', gap:6, color:G.muted, fontSize:13, fontWeight:600, textDecoration:'none', marginBottom:16 }}>
        <ArrowLeft size={15} /> Tounen nan Manm
      </Link>

      <div className="gym-fadeup" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:18, padding:22, boxShadow:G.shadow, marginBottom:18, animationDelay:'50ms' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${G.teal},#0d9488)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 6px 16px rgba(20,184,166,0.3)' }}>
            <User size={26} color="#fff" />
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <h1 style={{ margin:0, fontSize:19, fontWeight:800, color:G.ink }}>{member.fullName}</h1>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:6 }}>
              {member.phone && <span style={{ display:'flex', alignItems:'center', gap:5, color:G.muted, fontSize:12 }}><Phone size={12} />{member.phone}</span>}
              {member.email && <span style={{ display:'flex', alignItems:'center', gap:5, color:G.muted, fontSize:12 }}><Mail size={12} />{member.email}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => setShowMembership(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:12 }}>
              <Plus size={14} /> Abònman
            </button>
            <button onClick={() => setShowPayment(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.ink, fontWeight:700, cursor:'pointer', fontSize:12 }}>
              <Plus size={14} /> Peman
            </button>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gap:16 }}>
        <SectionCard icon={CreditCard} title="Istorik Abònman" color={G.teal} delay={100}>
          {!memberships?.length ? (
            <p style={{ color:G.muted, fontSize:13 }}>Pa gen abònman ankò.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {memberships.map(ms => {
                const meta = STATUS_COLORS[ms.status] || STATUS_COLORS.cancelled
                return (
                  <div key={ms.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:11, background:G.bgSoft, border:`1px solid ${G.border}`, flexWrap:'wrap', gap:8 }}>
                    <div>
                      <p style={{ margin:0, color:G.ink, fontWeight:700, fontSize:13 }}>{ms.planName || 'Plan'}</p>
                      <p style={{ margin:'2px 0 0', color:G.muted, fontSize:11 }}>
                        {new Date(ms.startDate).toLocaleDateString('fr-FR')} {ms.endDate && `→ ${new Date(ms.endDate).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'4px 9px', borderRadius:7, background:meta.bg, color:meta.color }}>{meta.label}</span>
                      <PrintButton title="Re-enprime resi abònman" onClick={() => printGym(member, tenant, 'plan', {
                        planName: ms.plan?.name || ms.planName,
                        amountPaid: ms.priceHtg,
                        startDate: ms.startDate,
                        endDate: ms.endDate,
                      })} />
                      {ms.status === 'active' && (
                        <button onClick={() => cancelMutation.mutate(ms.id)} title="Anile" style={{ background:'none', border:'none', color:G.red, cursor:'pointer', display:'flex' }}>
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Wallet} title="Istorik Peman" color={G.amber} delay={150}>
          {!payments?.length ? (
            <p style={{ color:G.muted, fontSize:13 }}>Pa gen peman ankò.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {payments.map(p => (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:11, background:G.bgSoft, border:`1px solid ${G.border}`, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <p style={{ margin:0, color:G.ink, fontWeight:700, fontSize:13 }}>{Number(p.amountHtg).toLocaleString('fr-FR')} HTG</p>
                    <p style={{ margin:'2px 0 0', color:G.muted, fontSize:11 }}>{new Date(p.createdAt).toLocaleDateString('fr-FR')} · {p.method}</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {p.notes && <span style={{ color:G.muted, fontSize:11, maxWidth:140, textAlign:'right' }}>{p.notes}</span>}
                    <PrintButton title="Re-enprime resi peman" onClick={() => {
                      if (p.type === 'daily') {
                        printGym(member, tenant, 'daily', { amount: p.amountHtg, method: p.method })
                      } else if (p.type === 'membership') {
                        printGym(member, tenant, 'plan', {
                          planName: p.membership?.plan?.name,
                          amountPaid: p.amountHtg, method: p.method,
                          startDate: p.membership?.startDate, endDate: p.membership?.endDate,
                        })
                      } else {
                        printGym(member, tenant, 'peman', { amount: p.amountHtg, method: p.method, notes: p.notes })
                      }
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={LogIn} title="Dènye Check-in" color="#6366f1" delay={200}>
          {!checkIns?.length ? (
            <p style={{ color:G.muted, fontSize:13 }}>Pa gen check-in ankò.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {checkIns.map(c => (
                <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:11, background:G.bgSoft, border:`1px solid ${G.border}` }}>
                  <span style={{ color:G.ink, fontSize:12.5, fontWeight:600 }}>{new Date(c.checkInAt).toLocaleDateString('fr-FR')}</span>
                  <span style={{ color:G.muted, fontSize:12 }}>
                    {new Date(c.checkInAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                    {c.checkOutAt && ` → ${new Date(c.checkOutAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {showMembership && <NewMembershipModal memberId={id} member={member} onClose={() => setShowMembership(false)} />}
      {showPayment && <NewPaymentModal memberId={id} onClose={() => setShowPayment(false)} />}

      <style>{`
        @keyframes gymFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gymPop { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .gym-fadeup { opacity:0; animation: gymFadeUp 0.4s ease forwards; }
        .gym-modal-pop { animation: gymPop 0.22s ease; }
      `}</style>
    </div>
  )
}