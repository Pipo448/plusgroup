// src/pages/admin/InternetTab.jsx
// ── Enpòte nan AdminDashboard.jsx epi rele <InternetTab adminApi={adminApi} isMobile={isMobile} /> ──

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const PLANS = ['Plan Baz 2Mbps', 'Plan Standad 5Mbps', 'Plan Avanse 10Mbps', 'Plan Biznis 20Mbps']

export default function InternetTab({ adminApi, isMobile }) {
  const [isps, setIsps]         = useState([])
  const [selectedISP, setSelectedISP] = useState(null)
  const [clients, setClients]   = useState([])
  const [mikConfig, setMikConfig] = useState({})
  const [loadingISPs, setLoadingISPs] = useState(true)
  const [loadingClients, setLoadingClients] = useState(false)

  // Forms
  const [showISPForm,    setShowISPForm]    = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showMikForm,    setShowMikForm]    = useState(false)
  const [editingISP,     setEditingISP]     = useState(null)
  const [editingClient,  setEditingClient]  = useState(null)
  const [saving,         setSaving]         = useState(false)

  const [ispForm, setIspForm] = useState({ name:'', owner_name:'', phone:'', email:'', slug:'' })
  const [clientForm, setClientForm] = useState({ full_name:'', phone:'', mikrotik_username:'', mikrotik_password:'', plan_name:'' })
  const [mikForm, setMikForm] = useState({ host:'', port:'8728', username:'admin', password:'', use_ssl:false })
  const [testResult, setTestResult] = useState(null)

  // ── Load ISPs ──────────────────────────────────────────
  const loadISPs = async () => {
    setLoadingISPs(true)
    try {
      const res = await adminApi.get('/internet/isps')
      setIsps(res.data?.isps || [])
    } catch { setIsps([]) }
    finally { setLoadingISPs(false) }
  }

  // ── Load kliyan pa ISP ──────────────────────────────────
  const loadClients = async (isp) => {
    setSelectedISP(isp)
    setLoadingClients(true)
    setShowMikForm(false)
    setShowClientForm(false)
    try {
      const [cRes, mRes] = await Promise.all([
        adminApi.get(`/internet/clients?isp_id=${isp.id}`),
        adminApi.get(`/internet/mikrotik-config?isp_id=${isp.id}`)
      ])
      setClients(cRes.data?.clients || [])
      const cfg = mRes.data || {}
      setMikConfig(cfg)
      setMikForm({
        host:     cfg.host     || '',
        port:     cfg.port     || '8728',
        username: cfg.username || 'admin',
        password: cfg.password || '',
        use_ssl:  cfg.use_ssl  || false,
      })
    } catch { setClients([]) }
    finally { setLoadingClients(false) }
  }

  useEffect(() => { loadISPs() }, [])

  // ── ISP Form ───────────────────────────────────────────
  const handleSaveISP = async () => {
    if (!ispForm.name || !ispForm.slug) { toast.error('Non ak slug obligatwa'); return }
    setSaving(true)
    try {
      if (editingISP) {
        await adminApi.put(`/internet/isps/${editingISP.id}`, ispForm)
        toast.success('ISP mete ajou!')
      } else {
        await adminApi.post('/internet/isps', ispForm)
        toast.success('ISP kreye!')
      }
      setShowISPForm(false); setEditingISP(null)
      setIspForm({ name:'', owner_name:'', phone:'', email:'', slug:'' })
      loadISPs()
    } catch(e) { toast.error(e.response?.data?.error || 'Erè') }
    finally { setSaving(false) }
  }

  const handleDeleteISP = async (isp) => {
    if (!window.confirm(`Efase "${isp.name}" ak tout kliyan li yo?`)) return
    try {
      await adminApi.delete(`/internet/isps/${isp.id}`)
      toast.success('ISP efase!')
      if (selectedISP?.id === isp.id) setSelectedISP(null)
      loadISPs()
    } catch(e) { toast.error(e.response?.data?.error || 'Erè efasaj') }
  }

  // ── Client Form ────────────────────────────────────────
  const handleSaveClient = async () => {
    if (!clientForm.full_name || !clientForm.mikrotik_username || !clientForm.mikrotik_password) {
      toast.error('Non, username ak modpas obligatwa'); return
    }
    setSaving(true)
    try {
      const data = { ...clientForm, internet_tenant_id: selectedISP?.id }
      if (editingClient) {
        await adminApi.put(`/internet/clients/${editingClient.id}`, data)
        toast.success('Kliyan mete ajou!')
      } else {
        await adminApi.post('/internet/clients', data)
        toast.success('Kliyan kreye!')
      }
      setShowClientForm(false); setEditingClient(null)
      setClientForm({ full_name:'', phone:'', mikrotik_username:'', mikrotik_password:'', plan_name:'' })
      loadClients(selectedISP)
    } catch(e) { toast.error(e.response?.data?.error || 'Erè') }
    finally { setSaving(false) }
  }

  const handleDeleteClient = async (c) => {
    if (!window.confirm(`Efase "${c.full_name}"?`)) return
    try {
      await adminApi.delete(`/internet/clients/${c.id}`)
      toast.success('Kliyan efase!')
      loadClients(selectedISP)
    } catch { toast.error('Erè efasaj') }
  }

  // ── Mikrotik Form ──────────────────────────────────────
  const handleSaveMik = async () => {
    setSaving(true)
    try {
      await adminApi.post('/internet/mikrotik-config', { ...mikForm, isp_id: selectedISP.id })
      toast.success('Konfigirasyon sove!')
      setShowMikForm(false)
    } catch(e) { toast.error(e.response?.data?.error || 'Erè') }
    finally { setSaving(false) }
  }

  const handleTestMik = async () => {
    setTestResult(null)
    try {
      await adminApi.post('/internet/mikrotik-config/test', { isp_id: selectedISP.id })
      setTestResult('ok'); toast.success('Mikrotik konekte!')
    } catch { setTestResult('fail'); toast.error('Koneksyon echwe') }
  }

  // ── Styles ─────────────────────────────────────────────
  const iS  = { width:'100%', padding:'10px 12px', borderRadius:9, boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, fontFamily:'DM Sans', outline:'none' }
  const lS  = { display:'block', color:'rgba(99,102,241,0.8)', fontSize:10, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }
  const btn = (bg, col) => ({ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:7, background:bg, border:'none', color:col, cursor:'pointer', fontSize:11, fontWeight:700 })

  return (
    <div style={{ padding: isMobile?'12px':'0', display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Header + bouton kreye ISP ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h3 style={{ color:'#fff', margin:0, fontSize:15, fontFamily:"'Playfair Display'" }}>📡 PLUS INTERNET</h3>
          <p style={{ color:'rgba(99,102,241,0.6)', fontSize:11, margin:'2px 0 0' }}>Jere ISP yo ak kliyan entènèt yo</p>
        </div>
        <button onClick={() => { setEditingISP(null); setIspForm({ name:'', owner_name:'', phone:'', email:'', slug:'' }); setShowISPForm(true) }}
          style={{ ...btn('linear-gradient(135deg,#6366f1,#8b5cf6)', '#fff'), padding:'8px 16px', fontSize:12 }}>
          + Nouvo ISP
        </button>
      </div>

      {/* ── Fòm ISP ── */}
      {showISPForm && (
        <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:14, padding:16 }}>
          <p style={{ color:'rgba(99,102,241,0.8)', fontSize:11, fontWeight:700, textTransform:'uppercase', margin:'0 0 12px' }}>
            {editingISP ? 'Edite ISP' : 'Nouvo ISP'}
          </p>
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(3,1fr)', gap:10, marginBottom:10 }}>
            <div><label style={lS}>Non ISP *</label><input style={iS} value={ispForm.name} onChange={e=>setIspForm(p=>({...p,name:e.target.value}))} placeholder="Fast Solution Multi-Services"/></div>
            <div><label style={lS}>Slug * (URL)</label><input style={{...iS,fontFamily:'monospace'}} value={ispForm.slug} onChange={e=>setIspForm(p=>({...p,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')}))} placeholder="fast-solution" disabled={!!editingISP}/></div>
            <div><label style={lS}>Pwopriyetè</label><input style={iS} value={ispForm.owner_name} onChange={e=>setIspForm(p=>({...p,owner_name:e.target.value}))} placeholder="Jean Dasner"/></div>
            <div><label style={lS}>Telefòn</label><input style={iS} value={ispForm.phone} onChange={e=>setIspForm(p=>({...p,phone:e.target.value}))} placeholder="50937000000"/></div>
            <div><label style={lS}>Email</label><input style={iS} value={ispForm.email} onChange={e=>setIspForm(p=>({...p,email:e.target.value}))} placeholder="contact@isp.ht"/></div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>{setShowISPForm(false);setEditingISP(null)}} style={btn('rgba(255,255,255,0.06)','rgba(255,255,255,0.5)')}>Anile</button>
            <button onClick={handleSaveISP} disabled={saving} style={btn('linear-gradient(135deg,#6366f1,#8b5cf6)','#fff')}>
              {saving ? 'Ap sove...' : editingISP ? 'Mete ajou' : 'Kreye ISP'}
            </button>
          </div>
        </div>
      )}

      {/* ── Liste ISP yo ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
        {loadingISPs ? (
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>Ap chaje ISP yo...</p>
        ) : isps.length === 0 ? (
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:12, padding:'24px', textAlign:'center', gridColumn:'1/-1' }}>
            <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, margin:0 }}>Pa gen ISP encore. Klike "+ Nouvo ISP" pou kòmanse.</p>
          </div>
        ) : isps.map(isp => (
          <div key={isp.id}
            onClick={() => loadClients(isp)}
            style={{ background: selectedISP?.id===isp.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border:`1px solid ${selectedISP?.id===isp.id ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all 0.2s' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📡</div>
                <div>
                  <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:0 }}>{isp.name}</p>
                  <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0 }}>{isp.owner_name || '—'}</p>
                </div>
              </div>
              <span style={{ background: isp.active ? 'rgba(39,174,96,0.12)' : 'rgba(192,57,43,0.12)', color: isp.active ? '#27ae60' : '#E8836A', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                {isp.active ? 'Aktif' : 'Inaktif'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', gap:10 }}>
                <span style={{ color:'rgba(99,102,241,0.7)', fontSize:11 }}>👥 {isp._count?.clients || 0} kliyan</span>
                {isp.phone && <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>📞 {isp.phone}</span>}
              </div>
              <div style={{ display:'flex', gap:5 }} onClick={e=>e.stopPropagation()}>
                <button onClick={() => { setEditingISP(isp); setIspForm({ name:isp.name, owner_name:isp.owner_name||'', phone:isp.phone||'', email:isp.email||'', slug:isp.slug }); setShowISPForm(true) }}
                  style={btn('rgba(99,102,241,0.1)','#818cf8')}>✏</button>
                <button onClick={() => handleDeleteISP(isp)}
                  style={btn('rgba(139,0,0,0.1)','#E8836A')}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Detay ISP seleksyone ── */}
      {selectedISP && (
        <div style={{ background:'rgba(255,255,255,0.01)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:16, overflow:'hidden' }}>

          {/* Header ISP seleksyone */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(99,102,241,0.1)', background:'rgba(99,102,241,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <p style={{ color:'#a5b4fc', fontSize:13, fontWeight:700, margin:0 }}>📡 {selectedISP.name}</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowMikForm(!showMikForm)}
                style={btn('rgba(245,158,11,0.1)','#f59e0b')}>⚙ Mikrotik</button>
              <button onClick={() => { setEditingClient(null); setClientForm({ full_name:'', phone:'', mikrotik_username:'', mikrotik_password:'', plan_name:'' }); setShowClientForm(true) }}
                style={btn('linear-gradient(135deg,#6366f1,#8b5cf6)','#fff')}>+ Nouvo kliyan</button>
            </div>
          </div>

          {/* Mikrotik config form */}
          {showMikForm && (
            <div style={{ padding:16, borderBottom:'1px solid rgba(245,158,11,0.1)', background:'rgba(245,158,11,0.03)' }}>
              <p style={{ color:'rgba(245,158,11,0.8)', fontSize:11, fontWeight:700, textTransform:'uppercase', margin:'0 0 12px' }}>Konfigirasyon Mikrotik</p>
              {testResult && (
                <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:10, background: testResult==='ok' ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)', color: testResult==='ok' ? '#27ae60' : '#E8836A', fontSize:12, fontWeight:600 }}>
                  {testResult==='ok' ? '✅ Koneksyon reyisi!' : '❌ Koneksyon echwe — verifye IP ak modpas'}
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(4,1fr)', gap:10, marginBottom:10 }}>
                <div><label style={lS}>IP Mikrotik</label><input style={iS} value={mikForm.host} onChange={e=>setMikForm(p=>({...p,host:e.target.value}))} placeholder="192.168.1.1"/></div>
                <div><label style={lS}>Pò</label><input style={iS} value={mikForm.port} onChange={e=>setMikForm(p=>({...p,port:e.target.value}))} placeholder="8728"/></div>
                <div><label style={lS}>Username</label><input style={iS} value={mikForm.username} onChange={e=>setMikForm(p=>({...p,username:e.target.value}))} placeholder="admin"/></div>
                <div><label style={lS}>Modpas</label><input style={iS} type="password" value={mikForm.password} onChange={e=>setMikForm(p=>({...p,password:e.target.value}))} placeholder="••••••••"/></div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleTestMik} style={btn('rgba(245,158,11,0.1)','#f59e0b')}>🔌 Teste</button>
                <button onClick={handleSaveMik} disabled={saving} style={btn('rgba(245,158,11,0.2)','#f59e0b')}>
                  {saving ? 'Ap sove...' : '💾 Sove'}
                </button>
              </div>
            </div>
          )}

          {/* Fòm kliyan */}
          {showClientForm && (
            <div style={{ padding:16, borderBottom:'1px solid rgba(99,102,241,0.1)', background:'rgba(99,102,241,0.03)' }}>
              <p style={{ color:'rgba(99,102,241,0.8)', fontSize:11, fontWeight:700, textTransform:'uppercase', margin:'0 0 12px' }}>
                {editingClient ? 'Edite kliyan' : 'Nouvo kliyan'}
              </p>
              <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(3,1fr)', gap:10, marginBottom:10 }}>
                <div><label style={lS}>Non konplè *</label><input style={iS} value={clientForm.full_name} onChange={e=>setClientForm(p=>({...p,full_name:e.target.value}))} placeholder="Jean Dasner"/></div>
                <div><label style={lS}>Telefòn</label><input style={iS} value={clientForm.phone} onChange={e=>setClientForm(p=>({...p,phone:e.target.value}))} placeholder="50937000000"/></div>
                <div>
                  <label style={lS}>Plan</label>
                  <select style={iS} value={clientForm.plan_name} onChange={e=>setClientForm(p=>({...p,plan_name:e.target.value}))}>
                    <option value="">Chwazi plan</option>
                    {PLANS.map(pl=><option key={pl} value={pl}>{pl}</option>)}
                  </select>
                </div>
                <div><label style={lS}>Username Mikrotik *</label><input style={{...iS,fontFamily:'monospace'}} value={clientForm.mikrotik_username} onChange={e=>setClientForm(p=>({...p,mikrotik_username:e.target.value}))} placeholder="client001" disabled={!!editingClient}/></div>
                <div><label style={lS}>Modpas *</label><input style={iS} value={clientForm.mikrotik_password} onChange={e=>setClientForm(p=>({...p,mikrotik_password:e.target.value}))} placeholder="••••••••"/></div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{setShowClientForm(false);setEditingClient(null)}} style={btn('rgba(255,255,255,0.06)','rgba(255,255,255,0.5)')}>Anile</button>
                <button onClick={handleSaveClient} disabled={saving} style={btn('linear-gradient(135deg,#6366f1,#8b5cf6)','#fff')}>
                  {saving ? 'Ap sove...' : editingClient ? 'Mete ajou' : 'Kreye kliyan'}
                </button>
              </div>
            </div>
          )}

          {/* Liste kliyan */}
          {loadingClients ? (
            <div style={{ padding:30, textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>Ap chaje kliyan yo...</div>
          ) : clients.length === 0 ? (
            <div style={{ padding:30, textAlign:'center' }}>
              <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, margin:0 }}>Pa gen kliyan pou ISP sa a encore.</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,0,0,0.2)' }}>
                  {['Kliyan','Username','Plan','Aksyon'].map((h,i)=>(
                    <th key={i} style={{ padding:'9px 14px', textAlign:'left', fontSize:9, fontWeight:700, color:'rgba(99,102,241,0.6)', textTransform:'uppercase', letterSpacing:'0.1em', borderBottom:'1px solid rgba(99,102,241,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c,idx)=>(
                  <tr key={c.id} style={{ borderBottom: idx<clients.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))', display:'flex', alignItems:'center', justifyContent:'center', color:'#a5b4fc', fontWeight:700, fontSize:12, flexShrink:0 }}>
                          {c.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ color:'#fff', fontSize:12, fontWeight:600, margin:0 }}>{c.full_name}</p>
                          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:0 }}>{c.phone||'—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(99,102,241,0.8)', background:'rgba(99,102,241,0.08)', padding:'2px 8px', borderRadius:5 }}>{c.mikrotik_username}</span>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ fontSize:11, color:'#a5b4fc', background:'rgba(99,102,241,0.08)', padding:'2px 10px', borderRadius:20 }}>{c.plan_name||'—'}</span>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={()=>{ setEditingClient(c); setClientForm({ full_name:c.full_name, phone:c.phone||'', mikrotik_username:c.mikrotik_username, mikrotik_password:c.mikrotik_password, plan_name:c.plan_name||'' }); setShowClientForm(true) }}
                          style={btn('rgba(99,102,241,0.1)','#818cf8')}>✏ Edite</button>
                        <button onClick={()=>handleDeleteClient(c)}
                          style={btn('rgba(139,0,0,0.1)','#E8836A')}>🗑 Efase</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
