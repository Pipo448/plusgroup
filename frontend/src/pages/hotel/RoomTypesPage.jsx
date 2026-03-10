// src/pages/hotel/RoomTypesPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Save,
  BedDouble, Users, Baby, DollarSign, Tag
} from 'lucide-react'
import { hotelAPI } from '../../services/hotelAPI'
import toast from 'react-hot-toast'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.12)',
  text:'#0F1A5C', muted:'#6B7AAB',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const AMENITY_OPTIONS = [
  'WiFi', 'AC', 'TV', 'Frigorifi', 'Balkon', 'Basen',
  'Jacuzzi', 'Kokiy', 'Sèvis chanm', 'Paking', 'Dejene',
]

const inputStyle = {
  width:'100%', padding:'10px 13px', borderRadius:10,
  border:`1.5px solid ${D.border}`, background:D.white,
  color:D.text, fontSize:13, fontWeight:500,
  outline:'none', boxSizing:'border-box',
  fontFamily:'DM Sans,sans-serif', transition:'border-color 0.2s',
}
const labelStyle = {
  display:'block', fontSize:11, fontWeight:800,
  color:D.muted, textTransform:'uppercase',
  letterSpacing:'0.07em', marginBottom:5,
}

const EMPTY_FORM = {
  name:'', description:'', priceHtg:'', priceUsd:'',
  maxAdults:'2', maxChildren:'1', amenities:[],
}

export default function RoomTypesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null) // null = nouvo, obj = edite
  const [form, setForm]           = useState(EMPTY_FORM)
  const [errors, setErrors]       = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['hotel-room-types'],
    queryFn: () => hotelAPI.getRoomTypes().then(r => r.data?.data || []),
  })
  const roomTypes = data || []

  const createMutation = useMutation({
    mutationFn: (d) => hotelAPI.createRoomType(d),
    onSuccess: () => { qc.invalidateQueries(['hotel-room-types']); toast.success('Tip chanm kreye!'); closeModal() },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erè kreyasyon'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, d }) => hotelAPI.updateRoomType(id, d),
    onSuccess: () => { qc.invalidateQueries(['hotel-room-types']); toast.success('Mete ajou!'); closeModal() },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erè mete ajou'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => hotelAPI.deleteRoomType(id),
    onSuccess: () => { qc.invalidateQueries(['hotel-room-types']); toast.success('Efase!'); setDeleteConfirm(null) },
    onError:   (e) => toast.error(e.response?.data?.message || 'Pa ka efase — chanm ki itilize tip sa'),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setShowModal(true) }
  const openEdit   = (rt) => {
    setEditing(rt)
    setForm({
      name:        rt.name || '',
      description: rt.description || '',
      priceHtg:    String(rt.priceHtg || ''),
      priceUsd:    String(rt.priceUsd || ''),
      maxAdults:   String(rt.maxAdults || 2),
      maxChildren: String(rt.maxChildren || 1),
      amenities:   rt.amenities || [],
    })
    setErrors({})
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); setErrors({}) }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })) }

  const toggleAmenity = (a) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
    }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())   e.name     = 'Non obligatwa'
    if (!form.priceHtg || isNaN(Number(form.priceHtg))) e.priceHtg = 'Pri HTG obligatwa'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const payload = {
      name:        form.name.trim(),
      description: form.description.trim() || null,
      priceHtg:    Number(form.priceHtg),
      priceUsd:    Number(form.priceUsd || 0),
      maxAdults:   parseInt(form.maxAdults || 2),
      maxChildren: parseInt(form.maxChildren || 1),
      amenities:   form.amenities,
    }
    if (editing) updateMutation.mutate({ id: editing.id, d: payload })
    else         createMutation.mutate(payload)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link to="/app/hotel/rooms/new" style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:36, height:36, borderRadius:10,
            background:D.blueDim2, border:`1px solid ${D.border}`,
            color:D.blue, textDecoration:'none',
          }}>
            <ArrowLeft size={15}/>
          </Link>
          <div style={{ width:42, height:42, borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 14px ${D.blue}40` }}>
            <Tag size={19} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:20, fontWeight:900, margin:0 }}>Tip Chanm</h1>
            <p style={{ color:D.muted, fontSize:12, margin:'2px 0 0' }}>{roomTypes.length} tip defini</p>
          </div>
        </div>
        <button onClick={openCreate} style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'10px 20px', borderRadius:12,
          background:`linear-gradient(135deg,${D.blue},${D.blueLt})`,
          color:'#fff', fontWeight:800, fontSize:13,
          border:'none', cursor:'pointer',
          boxShadow:`0 4px 16px ${D.blue}40`,
        }}>
          <Plus size={15}/> Nouvo Tip
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {Array(4).fill(0).map((_,i) => (
            <div key={i} style={{ height:160, borderRadius:16, background:'#EEF0FF', animation:'pulse 1.5s infinite' }}/>
          ))}
        </div>
      ) : roomTypes.length === 0 ? (
        <div style={{ padding:'60px 20px', textAlign:'center', background:D.white, borderRadius:16, border:`1px solid ${D.border}` }}>
          <BedDouble size={36} color={D.blue} style={{ marginBottom:12 }}/>
          <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:'0 0 16px' }}>Pa gen tip chanm encore</p>
          <button onClick={openCreate} style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'10px 20px', borderRadius:12,
            background:`linear-gradient(135deg,${D.blue},${D.blueLt})`,
            color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer',
          }}>
            <Plus size={14}/> Kreye premye tip la
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {roomTypes.map(rt => (
            <div key={rt.id} style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>
              <div style={{ height:4, background:`linear-gradient(90deg,${D.blue},${D.blueLt})` }}/>
              <div style={{ padding:'18px 18px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <h3 style={{ color:D.text, fontSize:15, fontWeight:900, margin:0 }}>{rt.name}</h3>
                    {rt.description && <p style={{ color:D.muted, fontSize:11, margin:'3px 0 0', lineHeight:1.4 }}>{rt.description}</p>}
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:8 }}>
                    <button onClick={() => openEdit(rt)} style={{
                      width:30, height:30, borderRadius:8, border:`1px solid ${D.border}`,
                      background:D.blueDim, color:D.blue, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => setDeleteConfirm(rt)} style={{
                      width:30, height:30, borderRadius:8, border:`1px solid rgba(192,57,43,0.15)`,
                      background:D.redDim, color:D.red, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                {/* Pri */}
                <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                  <div style={{ flex:1, padding:'8px 12px', borderRadius:10, background:D.blueDim2 }}>
                    <p style={{ fontSize:10, color:D.muted, fontWeight:700, margin:'0 0 2px' }}>HTG/nwit</p>
                    <p style={{ fontSize:14, fontWeight:900, color:D.blue, margin:0 }}>{Number(rt.priceHtg).toLocaleString()}</p>
                  </div>
                  {rt.priceUsd > 0 && (
                    <div style={{ flex:1, padding:'8px 12px', borderRadius:10, background:'rgba(5,150,105,0.06)' }}>
                      <p style={{ fontSize:10, color:D.muted, fontWeight:700, margin:'0 0 2px' }}>USD/nwit</p>
                      <p style={{ fontSize:14, fontWeight:900, color:D.success, margin:0 }}>${Number(rt.priceUsd).toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Kapasite */}
                <div style={{ display:'flex', gap:12, marginBottom: rt.amenities?.length ? 10 : 0 }}>
                  <span style={{ fontSize:11, color:D.muted, display:'flex', alignItems:'center', gap:4 }}>
                    <Users size={11}/> {rt.maxAdults} adilt
                  </span>
                  <span style={{ fontSize:11, color:D.muted, display:'flex', alignItems:'center', gap:4 }}>
                    <Baby size={11}/> {rt.maxChildren} timoun
                  </span>
                  {rt._count?.rooms !== undefined && (
                    <span style={{ fontSize:11, color:D.blue, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                      <BedDouble size={11}/> {rt._count.rooms} chanm
                    </span>
                  )}
                </div>

                {/* Amenities */}
                {rt.amenities?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {rt.amenities.map((a, i) => (
                      <span key={i} style={{ fontSize:10, padding:'3px 8px', borderRadius:99, background:D.blueDim, border:`1px solid ${D.border}`, color:D.blue, fontWeight:600 }}>{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL KREYE / EDITE ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ background:D.white, borderRadius:20, width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>

            <div style={{ height:4, background:`linear-gradient(90deg,${D.blue},${D.blueLt},${D.orange})`, flexShrink:0 }}/>

            {/* Modal header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:`1px solid ${D.border}`, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Tag size={16} color="#fff"/>
                </div>
                <div>
                  <h2 style={{ color:D.text, fontSize:16, fontWeight:900, margin:0 }}>
                    {editing ? 'Edite Tip Chanm' : 'Nouvo Tip Chanm'}
                  </h2>
                  <p style={{ color:D.muted, fontSize:11, margin:0 }}>{editing ? editing.name : 'Kreye yon nouvo tip'}</p>
                </div>
              </div>
              <button onClick={closeModal} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.border}`, background:D.blueDim, color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={15}/>
              </button>
            </div>

            {/* Modal body */}
            <div style={{ overflowY:'auto', padding:'20px 24px', flex:1 }}>

              {/* Non */}
              <div style={{ marginBottom:16 }}>
                <label style={labelStyle}>Non Tip Chanm *</label>
                <input type="text" placeholder="Ex: Chanm Estanda, Suite, Deluxe..." value={form.name} onChange={e => set('name', e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.name ? D.red : D.border }}
                  onFocus={e => e.target.style.borderColor = errors.name ? D.red : D.blue}
                  onBlur={e => e.target.style.borderColor = errors.name ? D.red : D.border}
                />
                {errors.name && <p style={{ color:D.red, fontSize:11, fontWeight:700, margin:'4px 0 0' }}>⚠ {errors.name}</p>}
              </div>

              {/* Deskripsyon */}
              <div style={{ marginBottom:16 }}>
                <label style={labelStyle}>Deskripsyon (opsyonèl)</label>
                <textarea placeholder="Dekriye tip chanm nan..." value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                  style={{ ...inputStyle, resize:'vertical', minHeight:60 }}
                  onFocus={e => e.target.style.borderColor = D.blue}
                  onBlur={e => e.target.style.borderColor = D.border}
                />
              </div>

              {/* Pri */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <label style={labelStyle}>Pri HTG/nwit *</label>
                  <input type="number" placeholder="0" value={form.priceHtg} onChange={e => set('priceHtg', e.target.value)} min="0"
                    style={{ ...inputStyle, borderColor: errors.priceHtg ? D.red : D.border }}
                    onFocus={e => e.target.style.borderColor = errors.priceHtg ? D.red : D.blue}
                    onBlur={e => e.target.style.borderColor = errors.priceHtg ? D.red : D.border}
                  />
                  {errors.priceHtg && <p style={{ color:D.red, fontSize:11, fontWeight:700, margin:'4px 0 0' }}>⚠ {errors.priceHtg}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Pri USD/nwit (opsyonèl)</label>
                  <input type="number" placeholder="0" value={form.priceUsd} onChange={e => set('priceUsd', e.target.value)} min="0"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = D.blue}
                    onBlur={e => e.target.style.borderColor = D.border}
                  />
                </div>
              </div>

              {/* Kapasite */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <label style={labelStyle}>Maks Adilt</label>
                  <input type="number" value={form.maxAdults} onChange={e => set('maxAdults', e.target.value)} min="1" max="10"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = D.blue}
                    onBlur={e => e.target.style.borderColor = D.border}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Maks Timoun</label>
                  <input type="number" value={form.maxChildren} onChange={e => set('maxChildren', e.target.value)} min="0" max="10"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = D.blue}
                    onBlur={e => e.target.style.borderColor = D.border}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div style={{ marginBottom:8 }}>
                <label style={labelStyle}>Ekipman / Sèvis</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {AMENITY_OPTIONS.map(a => {
                    const sel = form.amenities.includes(a)
                    return (
                      <button key={a} onClick={() => toggleAmenity(a)} style={{
                        padding:'6px 12px', borderRadius:99, fontSize:12, fontWeight:700, cursor:'pointer',
                        background: sel ? D.blue : D.blueDim,
                        color: sel ? '#fff' : D.blue,
                        border: `1.5px solid ${sel ? D.blue : D.border}`,
                        transition:'all 0.15s',
                      }}>
                        {sel ? '✓ ' : ''}{a}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding:'16px 24px', borderTop:`1px solid ${D.border}`, display:'flex', gap:10, flexShrink:0 }}>
              <button onClick={closeModal} style={{
                flex:1, padding:'11px', borderRadius:11,
                background:D.blueDim, border:`1.5px solid ${D.border}`,
                color:D.blue, fontWeight:800, fontSize:13, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:7,
              }}>
                <X size={14}/> Anile
              </button>
              <button onClick={handleSubmit} disabled={isPending} style={{
                flex:2, padding:'11px', borderRadius:11,
                background: isPending ? 'rgba(27,42,143,0.4)' : `linear-gradient(135deg,${D.blue},${D.blueLt})`,
                color:'#fff', fontWeight:800, fontSize:13,
                border:'none', cursor: isPending ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                boxShadow:`0 4px 14px ${D.blue}40`,
              }}>
                {isPending
                  ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap sove...</>
                  : <><Save size={14}/> {editing ? 'Mete Ajou' : 'Kreye Tip'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EFASE ── */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:1001, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:D.white, borderRadius:18, width:'100%', maxWidth:380, boxShadow:'0 24px 64px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            <div style={{ height:4, background:`linear-gradient(90deg,${D.red},#e74c3c)` }}/>
            <div style={{ padding:'24px 24px 20px' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:D.redDim, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                <Trash2 size={20} color={D.red}/>
              </div>
              <h3 style={{ color:D.text, fontSize:16, fontWeight:900, margin:'0 0 8px' }}>Efase Tip Chanm?</h3>
              <p style={{ color:D.muted, fontSize:13, margin:'0 0 20px', lineHeight:1.5 }}>
                Ou sèten ou vle efase <strong style={{ color:D.text }}>{deleteConfirm.name}</strong>? Aksyon sa pa ka defèt.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{
                  flex:1, padding:'10px', borderRadius:10,
                  background:D.blueDim, border:`1px solid ${D.border}`,
                  color:D.blue, fontWeight:800, fontSize:13, cursor:'pointer',
                }}>
                  Anile
                </button>
                <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending} style={{
                  flex:1, padding:'10px', borderRadius:10,
                  background:`linear-gradient(135deg,${D.red},#e74c3c)`,
                  color:'#fff', fontWeight:800, fontSize:13,
                  border:'none', cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                }}>
                  {deleteMutation.isPending ? 'Ap efase...' : 'Wi, Efase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
