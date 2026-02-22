// src/pages/settings/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Settings, Users, DollarSign, Upload, Save, RefreshCw, ArrowUpDown, Building2, Palette, Globe, Printer } from 'lucide-react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914', goldDim:'rgba(201,168,76,0.12)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF', border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid ${D.border}`, outline:'none',
  fontSize:13, color:D.text, background:'#F8F9FF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
  transition:'border-color 0.2s',
}

export default function SettingsPage() {
  const { updateTenant } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [newRate, setNewRate] = useState('')

  const { data:settings, isLoading } = useQuery({
    queryKey:['tenant-settings'],
    queryFn:() => tenantAPI.getSettings().then(r=>r.data.tenant)
  })

  const { register, handleSubmit, reset, watch, setValue } = useForm()

  useEffect(() => {
    if (settings) reset({
      name:            settings.name            || '',
      email:           settings.email           || '',
      phone:           settings.phone           || '',
      address:         settings.address         || '',
      primaryColor:    settings.primaryColor    || '#1B2A8F',
      taxRate:         settings.taxRate         || 0,
      defaultLanguage: settings.defaultLanguage || 'ht',
      defaultCurrency: settings.defaultCurrency || 'HTG',
      receiptSize:     settings.receiptSize     || '80mm',
    })
  }, [settings, reset])

  const updateMutation = useMutation({
    mutationFn: (data) => tenantAPI.updateSettings(data),
    onSuccess: (res) => {
      const updated = res.data.tenant
      updateTenant({ ...settings, ...updated })
      qc.setQueryData(['tenant-settings'], old => ({ ...old, ...updated }))
      toast.success('Paramèt sovgade!')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan sovgad.')
  })

  const rateMutation = useMutation({
    mutationFn: (rate) => tenantAPI.updateRate(rate),
    onSuccess: (_, rate) => {
      updateTenant({ ...settings, exchangeRate: rate })
      qc.setQueryData(['tenant-settings'], old => ({ ...old, exchangeRate: rate }))
      toast.success(`Taux ajou: 1 USD = ${rate} HTG`)
      setNewRate('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })

  const TABS = [
    { key:'general',  label:'Jeneral',      icon:<Building2 size={15}/> },
    { key:'currency', label:'Taux & Devise', icon:<DollarSign size={15}/> },
    { key:'users',    label:'Itilizatè',     icon:<Users size={15}/> },
  ]

  if (isLoading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'80px 0' }}>
      <div style={{ width:36, height:36, border:`3px solid ${D.blueDim2}`, borderTopColor:D.blue, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  const currentRate = Number(settings?.exchangeRate || 132)
  const primaryColor = watch('primaryColor') || D.blue

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth:760 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
          <Settings size={22} color="#fff"/>
        </div>
        <div>
          <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Paramèt</h1>
          <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{settings?.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'#EEF0FF', padding:5, borderRadius:14, width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10,
            fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.2s', fontFamily:'DM Sans,sans-serif',
            background: activeTab===t.key ? D.white : 'transparent',
            color: activeTab===t.key ? D.blue : D.muted,
            boxShadow: activeTab===t.key ? D.shadow : 'none',
            border: 'none',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══ JENERAL ══ */}
      {activeTab==='general' && (
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Enfòmasyon */}
          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:14, borderBottom:`1px solid ${D.border}` }}>
              <div style={{ width:32, height:32, borderRadius:9, background:D.blueDim2, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Building2 size={16} color={D.blue}/>
              </div>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Enfòmasyon Entreprise</h3>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Non Entreprise *</label>
                <input style={inp} {...register('name',{required:true})} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>
              {[{label:'Email',key:'email',type:'email'},{label:'Telefòn',key:'phone',type:'text'}].map(f=>(
                <div key={f.key}>
                  <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{f.label}</label>
                  <input type={f.type} style={inp} {...register(f.key)} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
                </div>
              ))}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Adrès</label>
                <input style={inp} {...register('address')} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>
              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Taks TVA (%)</label>
                <input type="number" step="0.5" min="0" max="100" style={inp} {...register('taxRate')} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>
              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Lang defò</label>
                <select style={inp} {...register('defaultLanguage')}>
                  <option value="ht">🇭🇹 Kreyòl Ayisyen</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Devise defò</label>
                <select style={inp} {...register('defaultCurrency')}>
                  <option value="HTG">HTG — Goud Ayisyen</option>
                  <option value="USD">USD — Dola Ameriken</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Receipt Thermal</label>
                <select style={inp} {...register('receiptSize')}>
                  <option value="80mm">80mm (Papye laj)</option>
                  <option value="57mm">57mm (Papye etwat)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Koulè + Logo */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Koulè */}
            <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <Palette size={16} color={D.blue}/>
                <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Koulè Prensipal</h3>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:48, height:48, borderRadius:12, background:primaryColor, flexShrink:0, boxShadow:`0 4px 14px ${primaryColor}50` }}/>
                <div style={{ flex:1 }}>
                  <input style={{ ...inp, fontFamily:'monospace', marginBottom:8 }} placeholder="#1B2A8F" {...register('primaryColor')}
                    onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}
                  />
                  <input type="color" value={primaryColor} onChange={e=>setValue('primaryColor',e.target.value)}
                    style={{ width:'100%', height:36, borderRadius:8, cursor:'pointer', border:`1px solid ${D.border}`, padding:3 }}
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <Upload size={16} color={D.blue}/>
                <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Logo</h3>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                {settings?.logoUrl
                  ? <img src={settings.logoUrl} alt="logo" style={{ width:56, height:56, borderRadius:12, objectFit:'contain', border:`1px solid ${D.border}`, padding:4 }}/>
                  : <div style={{ width:56, height:56, borderRadius:12, background:D.blueDim2, display:'flex', alignItems:'center', justifyContent:'center', color:D.blue, fontWeight:900, fontSize:20 }}>{settings?.name?.charAt(0)}</div>
                }
                <div>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:D.blueDim, color:D.blue, fontWeight:700, fontSize:12, cursor:'pointer', border:`1px solid ${D.border}` }}>
                    <Upload size={14}/> Chwazi Logo
                    <input type="file" accept="image/*" style={{ display:'none' }} onChange={async(e)=>{
                      const file=e.target.files[0]; if(!file) return
                      const fd=new FormData(); fd.append('logo',file)
                      try {
                        const res=await tenantAPI.uploadLogo(fd)
                        updateTenant({...settings,logoUrl:res.data.logoUrl})
                        qc.setQueryData(['tenant-settings'],old=>({...old,logoUrl:res.data.logoUrl}))
                        toast.success('Logo ajou!')
                      } catch { toast.error('Erè upload logo.') }
                    }}/>
                  </label>
                  <p style={{ fontSize:11, color:D.muted, marginTop:6 }}>PNG, JPG, SVG · 5MB max</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="submit" disabled={updateMutation.isPending} style={{
              display:'flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:12,
              background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff',
              border:'none', fontWeight:800, fontSize:14, cursor:'pointer',
              boxShadow:`0 4px 16px ${D.blue}40`, fontFamily:'DM Sans,sans-serif',
              opacity: updateMutation.isPending ? 0.7 : 1,
            }}>
              <Save size={16}/>{updateMutation.isPending ? 'Ap sovgade...' : 'Sovgade Chanjman'}
            </button>
          </div>
        </form>
      )}

      {/* ══ TAUX ══ */}
      {activeTab==='currency' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <ArrowUpDown size={16} color={D.blue}/>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Taux Chanje Aktyèl</h3>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', background:D.blueDim, border:`1px solid ${D.border}`, borderRadius:14, marginBottom:20 }}>
              <div style={{ width:48, height:48, borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 14px ${D.blue}40` }}>
                <ArrowUpDown size={20} color="#fff"/>
              </div>
              <div>
                <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:22, color:D.blue, margin:0 }}>1 USD = {currentRate.toFixed(2)} HTG</p>
                <p style={{ fontSize:12, color:D.muted, margin:'3px 0 0' }}>Taux sistèm ap itilize kounye a</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Nouvo Taux (HTG pou 1 USD)</label>
                <input type="number" step="0.01" min="1" style={{ ...inp, fontFamily:'monospace', fontSize:15 }} placeholder={currentRate.toFixed(2)} value={newRate} onChange={e=>setNewRate(e.target.value)}
                  onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>
              <button onClick={()=>{ const r=Number(newRate); if(!newRate||r<1) return toast.error('Taux pa valid.'); rateMutation.mutate(r) }}
                disabled={rateMutation.isPending||!newRate}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.gold},${D.goldDk})`, color:'#fff', border:'none', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:`0 4px 14px ${D.gold}40`, fontFamily:'DM Sans,sans-serif', whiteSpace:'nowrap', height:42 }}>
                <RefreshCw size={14}/>{rateMutation.isPending?'Ap mete...':'Mete ajou'}
              </button>
            </div>
          </div>
          {/* Eksplikasyon */}
          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>Konvèsyon Otomatik</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { title:'Kasye chwazi HTG', desc:`Antre pri an HTG. Konvèti an USD otomatikman. Egz: 10,000 HTG = ${(10000/currentRate).toFixed(2)} USD`, color:D.success, bg:D.successBg, tag:'HTG' },
                { title:'Kasye chwazi USD', desc:`Antre pri an USD. Konvèti an HTG otomatikman. Egz: 100 USD = ${(100*currentRate).toLocaleString()} HTG`, color:D.blue, bg:D.blueDim2, tag:'USD' },
              ].map(item=>(
                <div key={item.tag} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', background:item.bg, borderRadius:12, border:`1px solid ${item.color}20` }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:item.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:11, flexShrink:0 }}>{item.tag}</div>
                  <div>
                    <p style={{ fontWeight:700, color:item.color, fontSize:13, margin:'0 0 4px' }}>{item.title}</p>
                    <p style={{ fontSize:12, color:D.muted, margin:0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ ITILIZATÈ ══ */}
      {activeTab==='users' && (
        <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Users size={16} color={D.blue}/>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Jesyon Itilizatè</h3>
            </div>
            <Link to="/settings/users" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, textDecoration:'none', background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:700, fontSize:12, boxShadow:`0 3px 12px ${D.blue}35` }}>
              <Users size={13}/> Jere itilizatè
            </Link>
          </div>
          <p style={{ color:D.muted, fontSize:13, marginBottom:16 }}>Ajoute, modifye oswa siprime itilizatè ki gen aksè nan sistèm nan.</p>
          {settings?.plan && (
            <div style={{ padding:'12px 16px', background:D.blueDim, border:`1px solid ${D.border}`, borderRadius:12, fontSize:13, color:D.blue, fontWeight:600 }}>
              Plan <strong>{settings.plan.name}</strong> pèmèt <strong>{settings.plan.maxUsers} itilizatè</strong>.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
