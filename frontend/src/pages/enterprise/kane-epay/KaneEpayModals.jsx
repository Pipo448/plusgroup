// src/pages/enterprise/kane-epay/KaneEpayModals.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import {
  Printer, ArrowDownCircle, ArrowUpCircle, AlertCircle,
  Lock, FileText, CheckCircle, DollarSign, Trash2,
} from 'lucide-react'
import { D, inputStyle, labelStyle } from '../kaneShared.jsx'
import { fmt, fmtDate, getAccountPrefix } from './kaneEpayUtils'
import { PAYMENT_METHODS, FAMILY_RELATIONS, TX_STYLES } from './kaneEpayConstants'
import { kaneAPI } from './kaneEpayAPI'
import { Spinner, Section, Modal, PhotoBox } from './KaneEpayComponents'

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE KONT — ✅ Frè 250G otomatik (retire champ manyèl)
// ═══════════════════════════════════════════════════════════════
export function ModalCreate({ onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const prefix = getAccountPrefix(tenant)
  const FRE_OTOMATIK = 250  // ✅ 250G hardcode — pa bezwen admin antre l

  const [form, setForm] = useState({
    firstName:'', lastName:'', address:'', nifOrCin:'', phone:'',
    familyRelation:'', familyName:'', openingAmount:'', lockedAmount:'',
    method:'cash', reference:'',
  })
  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [photoB64,       setPhotoB64]       = useState(null)
  const [idPhotoB64,     setIdPhotoB64]     = useState(null)
  const [errors, setErrors] = useState({})

  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const opening = Number(form.openingAmount || 0)
  const locked  = Number(form.lockedAmount  || 0)
  const balance = opening - FRE_OTOMATIK - locked

  const handlePhoto = (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = (ev) => {
      const b64 = ev.target.result
      if (type === 'photo')   { setPhotoPreview(b64); setPhotoB64(b64)   }
      if (type === 'idPhoto') { setIdPhotoPreview(b64); setIdPhotoB64(b64) }
    }
    r.readAsDataURL(file)
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Obligatwa'
    if (!form.lastName.trim())  e.lastName  = 'Obligatwa'
    if (opening <= 0)           e.opening   = 'Montan dwe > 0'
    setErrors(e); return !Object.keys(e).length
  }

  const mutation = useMutation({
    mutationFn: (d) => kaneAPI.create(d),
    onSuccess: async (res) => {
      const acc = res.data.account
      toast.success(`✅ Kont ${acc.accountNumber} kreye!`)
      onSuccess(); onClose()
      try { await printer.print(acc, { createdAt: new Date(), method: form.method, reference: form.reference }, tenant, 'ouverture') }
      catch { toast('Kont kreye ✅ — Printer pa disponib.', { icon: '⚠️' }) }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan enskripsyon.'),
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      address: form.address||undefined, nifOrCin: form.nifOrCin||undefined,
      phone: form.phone||undefined, familyRelation: form.familyRelation||undefined,
      familyName: form.familyName||undefined, openingAmount: opening,
      lockedAmount: locked, method: form.method,
      reference: form.reference||undefined, accountPrefix: prefix,
      photoUrl: photoB64||undefined, idPhotoUrl: idPhotoB64||undefined,
    })
  }

  return (
    <Modal onClose={onClose} title={`✚ Nouvo Kont — ${prefix}`} width={580}>
      {/* Nimewo otomatik */}
      <div style={{ background:D.goldDim, border:`1px solid ${D.gold}30`, borderRadius:10, padding:'8px 12px', marginBottom:14, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:D.gold, fontWeight:700 }}>Nimewo kont:</span>
        <span style={{ fontFamily:'monospace', fontWeight:900, color:D.text, fontSize:13 }}>{prefix}-{new Date().getFullYear()}-XXXXX</span>
        <span style={{ fontSize:10, color:D.muted }}>(otomatik)</span>
      </div>

      <Section icon="👤" title="Enfòmasyon Titilè">
        {/* Prenon + Non */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={labelStyle}>Prenon *</label>
            <input className="ke-input" style={{ ...inputStyle, borderColor: errors.firstName ? D.red : undefined }}
              value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Prenon..."/>
            {errors.firstName && <p style={{ fontSize:10, color:D.red, margin:'3px 0 0' }}>{errors.firstName}</p>}
          </div>
          <div>
            <label style={labelStyle}>Non *</label>
            <input className="ke-input" style={{ ...inputStyle, borderColor: errors.lastName ? D.red : undefined }}
              value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Non..."/>
            {errors.lastName && <p style={{ fontSize:10, color:D.red, margin:'3px 0 0' }}>{errors.lastName}</p>}
          </div>
        </div>
        {/* NIF + Tel */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
          <div>
            <label style={labelStyle}>NIF / CIN</label>
            <input className="ke-input" style={inputStyle} value={form.nifOrCin} onChange={e => set('nifOrCin', e.target.value)} placeholder="001-234-5678"/>
          </div>
          <div>
            <label style={labelStyle}>Telefòn</label>
            <input className="ke-input" style={inputStyle} inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509 XXXX XXXX"/>
          </div>
        </div>
        <div style={{ marginTop:10 }}>
          <label style={labelStyle}>Adrès</label>
          <input className="ke-input" style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..."/>
        </div>
      </Section>

      <Section icon="📸" title="Foto KYC">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <PhotoBox label="Foto Kliyan (opsyonèl)" icon="📷" preview={photoPreview}   inputId="ke-photo"   onChange={e => handlePhoto(e,'photo')}   hint="Foto fas kliyan"/>
          <PhotoBox label="Foto Kat Idantite"       icon="🪪" preview={idPhotoPreview} inputId="ke-idphoto" onChange={e => handlePhoto(e,'idPhoto')} hint="CIN, Paspo, lòt ID"/>
        </div>
      </Section>

      <Section icon="👨‍👩‍👧" title="Referans Fanmi">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={labelStyle}>Relasyon</label>
            <select className="ke-input" style={{ ...inputStyle, cursor:'pointer' }} value={form.familyRelation} onChange={e => set('familyRelation', e.target.value)}>
              <option value="">— Chwazi —</option>
              {FAMILY_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Non Referans</label>
            <input className="ke-input" style={inputStyle} value={form.familyName} onChange={e => set('familyName', e.target.value)} placeholder="Non..."/>
          </div>
        </div>
      </Section>

      <Section icon="💰" title="Montan Ouverture">
        <label style={labelStyle}>Montan Total Kliyan Peye (HTG) *</label>
        <input type="number" min="0" step="0.01" className="ke-input"
          style={{ ...inputStyle, fontSize:22, fontWeight:800, textAlign:'center', color:D.gold, marginBottom:10, borderColor: errors.opening ? D.red : undefined }}
          value={form.openingAmount} onChange={e => set('openingAmount', e.target.value)} placeholder="0.00" onFocus={e => e.target.select()}/>
        {errors.opening && <p style={{ fontSize:10, color:D.red, margin:'-8px 0 8px' }}>{errors.opening}</p>}

        {opening > 0 && (
          <>
            {/* Rezime kalkilasyon */}
            <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'10px 14px', border:`1px solid ${D.cardBorder}`, fontSize:12, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:D.muted }}>Montan total:</span>
                <span style={{ color:D.gold, fontFamily:'monospace', fontWeight:700 }}>{fmt(opening)} HTG</span>
              </div>
              {/* ✅ Frè 250G — afiche otomatik, pa editab */}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, alignItems:'center' }}>
                <span style={{ color:D.muted }}>Frè ouverture <span style={{ background:`${D.red}20`, color:D.red, padding:'1px 6px', borderRadius:4, fontSize:10, fontWeight:700 }}>OTOMATIK</span>:</span>
                <span style={{ color:D.red, fontFamily:'monospace', fontWeight:700 }}>- {fmt(FRE_OTOMATIK)} HTG</span>
              </div>
              {/* Montan Bloke opsyonèl */}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, alignItems:'center', gap:10 }}>
                <span style={{ color:D.muted, flexShrink:0 }}>Montan Bloke:</span>
                <input type="number" min="0" step="0.01" className="ke-input"
                  style={{ ...inputStyle, width:130, padding:'4px 8px', fontSize:12, color:D.orange, borderColor:`${D.orange}40`, textAlign:'right' }}
                  value={form.lockedAmount} onChange={e => set('lockedAmount', e.target.value)} placeholder="0.00"/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', borderTop:`1px solid ${D.cardBorder}`, paddingTop:8 }}>
                <span style={{ fontWeight:800, color:D.text }}>Balans kont:</span>
                <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:15, color: balance >= 0 ? D.green : D.red }}>{fmt(balance)} HTG</span>
              </div>
            </div>

            {/* Bann pwogrè */}
            <div style={{ borderRadius:6, overflow:'hidden', height:7, background:'rgba(255,255,255,0.06)', display:'flex', marginBottom:6 }}>
              <div style={{ width:`${Math.min((FRE_OTOMATIK/opening)*100,100)}%`, background:D.red }}/>
              {locked > 0 && <div style={{ width:`${Math.min((locked/opening)*100,100)}%`, background:D.orange }}/>}
              {balance > 0 && <div style={{ flex:1, background:D.green }}/>}
            </div>
            <div style={{ display:'flex', gap:12, fontSize:11, fontWeight:700, flexWrap:'wrap' }}>
              <span style={{ color:D.red }}>🔴 Frè: {fmt(FRE_OTOMATIK)}</span>
              {locked > 0 && <span style={{ color:D.orange }}>🟠 Bloke: {fmt(locked)}</span>}
              <span style={{ color: balance >= 0 ? D.green : D.red }}>🟢 Balans: {fmt(balance)}</span>
            </div>
          </>
        )}
      </Section>

      {/* Metod peman */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div>
          <label style={labelStyle}>Metod Peman</label>
          <select className="ke-input" style={{ ...inputStyle, cursor:'pointer' }} value={form.method} onChange={e => set('method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Referans</label>
          <input className="ke-input" style={inputStyle} value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="MCash #12345"/>
        </div>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <button className="ke-btn" onClick={onClose} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
        <button className="ke-btn" onClick={handleSubmit} disabled={mutation.isPending || opening <= 0}
          style={{ flex:2, padding:'13px', borderRadius:12, border:'none', cursor:'pointer', background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:14, opacity: mutation.isPending||opening<=0 ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          {mutation.isPending ? <><Spinner color="#0a1222"/> Ap kreye...</> : <><Printer size={15}/> Kreye + Enprime</>}
        </button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DEPO / RETRÈ
// ═══════════════════════════════════════════════════════════════
export function ModalTx({ account, type, onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({ amount:'', method:'cash', reference:'' })
  const amt    = Number(form.amount || 0)
  const isW    = type === 'retrait'
  const color  = isW ? D.red : D.green
  const bal    = Number(account.balance)
  const newBal = isW ? bal - amt : bal + amt
  const balOk  = !isW || amt <= bal
  const disabled = useMutation && false // placeholder
  const mutation = useMutation({
    mutationFn: (d) => isW ? kaneAPI.withdraw(account.id, d) : kaneAPI.deposit(account.id, d),
    onSuccess: async (res) => {
      const { transaction } = res.data
      toast.success(`${isW ? 'Retrè' : 'Depo'} ${fmt(transaction.amount)} HTG ✅`)
      onSuccess(); onClose()
      try { await printer.print(account, transaction, tenant, type) } catch {}
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè tranzaksyon.'),
  })
  const isDisabled = mutation.isPending || amt <= 0 || !balOk

  return (
    <Modal onClose={onClose} title={`${isW ? '↑ Retrè' : '↓ Depo'} — ${account.accountNumber}`} width={420}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {/* Info kont */}
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'12px 14px', border:`1px solid ${D.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:D.text, margin:0 }}>{account.firstName} {account.lastName}</p>
            <p style={{ fontSize:11, color:D.muted, margin:'2px 0 0', fontFamily:'monospace' }}>{account.accountNumber}</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, color:D.muted, margin:'0 0 2px' }}>Balans aktyèl</p>
            <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color:D.green, margin:0 }}>{fmt(bal)} HTG</p>
            {Number(account.lockedAmount) > 0 && <p style={{ fontSize:10, color:D.orange, margin:'2px 0 0' }}>🔒 {fmt(account.lockedAmount)} bloke</p>}
          </div>
        </div>
        {/* Montan */}
        <div>
          <label style={{ ...labelStyle, color }}>{isW ? 'Montan Retrè' : 'Montan Depo'} (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="ke-input"
            style={{ ...inputStyle, fontSize:28, fontWeight:800, textAlign:'center', borderColor:`${color}50`, color }}
            value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" onFocus={e => e.target.select()} autoFocus/>
        </div>
        {/* Preview nouvo balans */}
        {amt > 0 && (
          <div style={{ background: balOk ? (isW ? D.redBg : D.greenBg) : D.redBg, borderRadius:10, padding:'12px 14px', border:`1px solid ${balOk ? color+'25' : D.red+'40'}` }}>
            {!balOk
              ? <div style={{ display:'flex', alignItems:'center', gap:8, color:D.red }}><AlertCircle size={14}/><span style={{ fontSize:13, fontWeight:700 }}>Balans ensifizàn! Disponib: {fmt(bal)} HTG</span></div>
              : <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:700, color }}>Nouvo balans:</span>
                  <span style={{ fontFamily:'monospace', fontSize:17, fontWeight:900, color }}>{fmt(newBal)} HTG</span>
                </div>}
          </div>
        )}
        {/* Metod */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={labelStyle}>Metod</label>
            <select className="ke-input" style={{ ...inputStyle, cursor:'pointer' }} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Referans</label>
            <input className="ke-input" style={inputStyle} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="MCash #..."/>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="ke-btn" onClick={onClose} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button className="ke-btn" onClick={() => mutation.mutate({ amount:amt, method:form.method, reference:form.reference||undefined })} disabled={isDisabled}
            style={{ flex:2, padding:'13px', borderRadius:12, border:'none', cursor:isDisabled?'not-allowed':'pointer', background:`linear-gradient(135deg,${color},${color}bb)`, color:'#fff', fontWeight:800, fontSize:14, opacity:isDisabled?0.5:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            {mutation.isPending ? <Spinner/> : isW ? <ArrowUpCircle size={15}/> : <ArrowDownCircle size={15}/>}
            {mutation.isPending ? 'Ap trete...' : `Konfime ${isW ? 'Retrè' : 'Depo'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY — Admin delete tranzaksyon/kont
// ═══════════════════════════════════════════════════════════════
export function ModalDetail({ accountId, onClose, onDepo, onRetrait, printer }) {
  const { tenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdminUser = user?.role === 'admin'

  const { data: account, isLoading } = useQuery({
    queryKey: ['kane-account', accountId],
    queryFn:  () => kaneAPI.getOne(accountId).then(r => r.data.account),
    enabled:  !!accountId,
  })

  const mutDeleteAccount = useMutation({
    mutationFn: () => kaneAPI.deleteAccount(accountId),
    onSuccess: () => {
      toast.success('✅ Kont efase!')
      qc.invalidateQueries(['kane-accounts'])
      qc.invalidateQueries(['kane-stats'])
      onClose()
    },
    onError: e => toast.error(e.response?.data?.message || 'Erè efase kont.'),
  })

  const handleDeleteTx = (tx) => {
    if (!window.confirm(`Efase tranzaksyon ${tx.type} ${Number(tx.amount).toLocaleString()} HTG?\n⚠️ Balans kont lan ap korije otomatikman.`)) return
    kaneAPI.deleteTransaction(tx.id)
      .then(() => {
        toast.success('✅ Tranzaksyon efase!')
        qc.invalidateQueries(['kane-account', accountId])
        qc.invalidateQueries(['kane-accounts'])
        qc.invalidateQueries(['kane-stats'])
      })
      .catch(err => toast.error(err.response?.data?.message || 'Erè efase.'))
  }

  if (isLoading || !account) return (
    <Modal onClose={onClose} title="Detay Kont" width={580}>
      <div style={{ textAlign:'center', padding:40, color:D.muted, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <Spinner color={D.gold} size={18}/> Ap chaje...
      </div>
    </Modal>
  )

  const totalDepo    = account.transactions?.filter(t => t.type==='depot').reduce((s,t)   => s+Number(t.amount), 0) || 0
  const totalRetrait = account.transactions?.filter(t => t.type==='retrait').reduce((s,t) => s+Number(t.amount), 0) || 0

  return (
    <Modal onClose={onClose} title={`📋 ${account.accountNumber}`} width={580}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {/* Bannè */}
        <div style={{ background:D.goldBtn, borderRadius:14, padding:'14px 16px', color:'#0a1222', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
          <div style={{ minWidth:0, flex:1 }}>
            <p style={{ fontSize:17, fontWeight:900, margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{account.firstName} {account.lastName}</p>
            <p style={{ fontSize:10, opacity:0.7, margin:0, fontFamily:'monospace' }}>{account.accountNumber}</p>
            {account.nifOrCin && <p style={{ fontSize:10, opacity:0.65, margin:'2px 0 0' }}>NIF: {account.nifOrCin}</p>}
            {account.phone    && <p style={{ fontSize:10, opacity:0.65, margin:'2px 0 0' }}>📱 {account.phone}</p>}
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontSize:10, opacity:0.6, margin:'0 0 2px' }}>BALANS</p>
            <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:22, margin:0 }}>{fmt(account.balance)} HTG</p>
            {Number(account.lockedAmount) > 0 && <p style={{ fontSize:9, opacity:0.5, margin:'2px 0 0' }}>🔒 {fmt(account.lockedAmount)} HTG bloke</p>}
          </div>
        </div>
        {/* Stats depo/retrè */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div style={{ background:D.greenBg, borderRadius:10, padding:'10px 12px', border:`1px solid ${D.green}20` }}>
            <p style={{ fontSize:10, color:D.muted, margin:'0 0 3px', textTransform:'uppercase', fontWeight:700 }}>Total Depo</p>
            <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:D.green, margin:0 }}>+{fmt(totalDepo)} HTG</p>
          </div>
          <div style={{ background:D.redBg, borderRadius:10, padding:'10px 12px', border:`1px solid ${D.red}20` }}>
            <p style={{ fontSize:10, color:D.muted, margin:'0 0 3px', textTransform:'uppercase', fontWeight:700 }}>Total Retrè</p>
            <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:D.red, margin:0 }}>-{fmt(totalRetrait)} HTG</p>
          </div>
        </div>
        {/* Foto KYC */}
        {(account.photoUrl || account.idPhotoUrl) && (
          <div style={{ display:'grid', gridTemplateColumns: account.photoUrl && account.idPhotoUrl ? '1fr 1fr' : '1fr', gap:10 }}>
            {account.photoUrl   && <div><p style={{ ...labelStyle, marginBottom:5 }}>Foto Kliyan</p><img src={account.photoUrl}   alt="" style={{ width:'100%', height:90, objectFit:'cover', borderRadius:10, border:`1px solid ${D.cardBorder}` }}/></div>}
            {account.idPhotoUrl && <div><p style={{ ...labelStyle, marginBottom:5 }}>Kat Idantite</p><img src={account.idPhotoUrl} alt="" style={{ width:'100%', height:90, objectFit:'cover', borderRadius:10, border:`1px solid ${D.cardBorder}` }}/></div>}
          </div>
        )}
        {/* Boutons aksyon */}
        <div style={{ display:'flex', gap:8 }}>
          <button className="ke-btn" onClick={onDepo}
            style={{ flex:1, padding:'11px', borderRadius:10, border:`1px solid ${D.green}30`, background:D.greenBg, color:D.green, fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <ArrowDownCircle size={14}/> Depo
          </button>
          <button className="ke-btn" onClick={onRetrait}
            style={{ flex:1, padding:'11px', borderRadius:10, border:`1px solid ${D.red}30`, background:D.redBg, color:D.red, fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <ArrowUpCircle size={14}/> Retrè
          </button>
          <button className="ke-btn" onClick={() => printer.print(account, account.transactions?.[0], tenant, 'ouverture')} disabled={printer.printing}
            style={{ padding:'11px 14px', borderRadius:10, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center' }}>
            <Printer size={14}/>
          </button>
        </div>
        {/* Admin: efase kont */}
        {isAdminUser && (
          <div style={{ borderTop:`1px solid ${D.red}25`, paddingTop:10 }}>
            <p style={{ fontSize:10, fontWeight:700, color:D.red, textTransform:'uppercase', margin:'0 0 8px' }}>⚠️ Zone Admin</p>
            <button className="ke-btn" onClick={() => {
              if (window.confirm(`Efase kont ${account.accountNumber}?\n⚠️ Tout tranzaksyon ap efase. IREVERSIB.`)) mutDeleteAccount.mutate()
            }} disabled={mutDeleteAccount.isPending}
              style={{ width:'100%', padding:'10px', borderRadius:10, border:`1px solid ${D.red}40`, background:D.redBg, color:D.red, cursor:'pointer', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              {mutDeleteAccount.isPending ? <Spinner size={13} color={D.red}/> : <Trash2 size={14}/>}
              {mutDeleteAccount.isPending ? 'Ap efase...' : `Efase Kont ${account.accountNumber}`}
            </button>
          </div>
        )}
        {/* Istwa */}
        <div>
          <p style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', color:D.muted, margin:'0 0 8px', letterSpacing:'0.06em' }}>
            Istwa ({account.transactions?.length || 0})
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:260, overflowY:'auto' }}>
            {!account.transactions?.length
              ? <p style={{ textAlign:'center', color:D.muted, fontSize:12, padding:20 }}>Pa gen tranzaksyon</p>
              : account.transactions.map(tx => {
                  const cfg = TX_STYLES[tx.type] || TX_STYLES.ouverture
                  return (
                    <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:10, background:cfg.bg, border:`1px solid ${cfg.color}20` }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:`${cfg.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:cfg.color, flexShrink:0 }}>{cfg.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:4 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                          <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:11, color:cfg.color, flexShrink:0 }}>{tx.type==='retrait'?'-':'+'}{fmt(tx.amount)} G</span>
                        </div>
                        <p style={{ fontSize:10, color:D.muted, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fmtDate(tx.createdAt)} • {tx.method}{tx.reference?` • ${tx.reference}`:''}</p>
                      </div>
                      <button className="ke-btn" onClick={() => printer.print(account, tx, tenant, tx.type)} disabled={printer.printing}
                        style={{ width:24, height:24, borderRadius:6, border:'none', background:'rgba(255,255,255,0.05)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Printer size={10}/>
                      </button>
                      {isAdminUser && (
                        <button className="ke-btn" title="Efase" onClick={() => handleDeleteTx(tx)}
                          style={{ width:24, height:24, borderRadius:6, border:'none', background:'rgba(251,113,133,0.12)', color:'#FB7185', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Trash2 size={10}/>
                        </button>
                      )}
                    </div>
                  )
                })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: FEMEN KÈS
// ═══════════════════════════════════════════════════════════════
export function ModalRapoKesyeKane({ onClose, onKesFemen, statsKane }) {
  const qc = useQueryClient()
  const [etap,         setEtap]         = useState(1)
  const [notes,        setNotes]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [rapo,         setRapo]         = useState(null)
  const [montantFizik, setMontantFizik] = useState('')
  const [preStats,     setPreStats]     = useState(null)

  useEffect(() => {
    api.get('/pre/stats').then(r => setPreStats(r.data.stats)).catch(() => {})
  }, [])

  const depoJou      = Number(statsKane?.todayDepositAmount  || 0)
  const retrèJou     = Number(statsKane?.todayWithdrawAmount || 0)
  const kolPre       = Number(preStats?.totalPaiemanMwa || 0)
  const desPre       = Number(preStats?.totalDesèmanMwa || 0)
  const totalCashIn  = depoJou + kolPre
  const totalCashOut = retrèJou + desPre
  const netSystem    = totalCashIn - totalCashOut
  const montFizikNum = Number(montantFizik || 0)
  const diferans     = montFizikNum - netSystem
  const hasMontant   = montFizikNum > 0
  const difColor = Math.abs(diferans) < 0.01 ? D.green : diferans > 0 ? D.orange : D.red
  const difLabel = Math.abs(diferans) < 0.01 ? '✅ Balans kòrèkt' : diferans > 0 ? `📈 ${fmt(diferans)} HTG anplis` : `📉 ${fmt(Math.abs(diferans))} HTG mank`

  const handleFemen = async () => {
    if (!hasMontant) return
    setLoading(true)
    try {
      const notesFinale = [notes||'', `Montan fizik: ${fmt(montFizikNum)} HTG`, `Nèt sistèm: ${fmt(netSystem)} HTG`, `Diferans: ${diferans>=0?'+':''}${fmt(diferans)} HTG`].filter(Boolean).join(' | ')
      const res = await kaneAPI.femenKes({ notes: notesFinale })
      setRapo(res.data.rapo)
      toast.success('✅ Kès fèmen!')
      qc.invalidateQueries(['kes-status'])
      onKesFemen()
    } catch (e) { toast.error(e.response?.data?.message || 'Erè fèmen kès.') }
    finally { setLoading(false) }
  }

  return (
    <Modal onClose={onClose} title={`📊 Fèmen Kès${etap===2?' — Etap 2/2':' — Rezime'}`} width={500}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {etap === 1 && !rapo && (
          <>
            <div style={{ background:`${D.orange}10`, border:`1px solid ${D.orange}25`, borderRadius:10, padding:'10px 14px' }}>
              <p style={{ fontSize:12, color:D.orange, margin:0 }}>⚠️ Fèmen kès la ap <strong>bloke tou 2 paj yo</strong> jiskaske demen.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Depo Kane',     val:`${fmt(depoJou)} HTG`,  color:D.green  },
                { label:'Retrè Kane',    val:`${fmt(retrèJou)} HTG`, color:D.red    },
                { label:'Koleksyon Prè', val:`${fmt(kolPre)} HTG`,   color:D.green  },
                { label:'Dekèsman Prè',  val:`${fmt(desPre)} HTG`,   color:D.orange },
                { label:'Prè Aktif',     val:`${preStats?.pretsActifs||0}`, color:D.blue },
                { label:'An Reta',       val:`${preStats?.totalEnReta||0}`, color:D.red  },
              ].map(item => (
                <div key={item.label} style={{ background:`${item.color}10`, borderRadius:10, padding:'10px 12px', border:`1px solid ${item.color}20` }}>
                  <p style={{ fontSize:10, color:D.muted, margin:'0 0 3px', textTransform:'uppercase', fontWeight:700 }}>{item.label}</p>
                  <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:13, color:item.color, margin:0 }}>{item.val}</p>
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Nòt (opsyonèl)</label>
              <textarea className="ke-input" style={{ ...inputStyle, height:52, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Obsèvasyon jounen an..."/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="ke-btn" onClick={onClose} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
              <button className="ke-btn" onClick={() => setEtap(2)}
                style={{ flex:2, padding:'13px', borderRadius:12, border:'none', cursor:'pointer', background:`linear-gradient(135deg,${D.orange},${D.orange}bb)`, color:'#fff', fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <FileText size={15}/> Kontinye → Konfimasyon
              </button>
            </div>
          </>
        )}
        {etap === 2 && !rapo && (
          <>
            <div style={{ background:`${D.red}10`, border:`1px solid ${D.red}30`, borderRadius:10, padding:'10px 14px' }}>
              <p style={{ fontSize:12, color:D.red, margin:0, fontWeight:700 }}>🔒 Etap final — <strong>p ap ka defèt</strong>.</p>
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'12px 14px', border:`1px solid ${D.cardBorder}`, fontSize:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:D.muted }}>Lajan Rantre:</span>
                <span style={{ color:D.green, fontFamily:'monospace', fontWeight:700 }}>+{fmt(totalCashIn)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ color:D.muted }}>Lajan Soti:</span>
                <span style={{ color:D.red, fontFamily:'monospace', fontWeight:700 }}>−{fmt(totalCashOut)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', borderTop:`1px solid ${D.cardBorder}`, paddingTop:8 }}>
                <span style={{ fontWeight:800, color:D.text }}>Nèt Sistèm:</span>
                <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:15, color:D.gold }}>{fmt(netSystem)} HTG</span>
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, color:D.blue }}>Montan Fizik nan Kès (HTG) *</label>
              <input type="number" min="0" step="0.01" className="ke-input"
                style={{ ...inputStyle, fontSize:24, fontWeight:800, textAlign:'center', color:D.blue, borderColor:`${D.blue}50` }}
                value={montantFizik} onChange={e => setMontantFizik(e.target.value)} placeholder="0.00" onFocus={e => e.target.select()} autoFocus/>
            </div>
            {hasMontant && (
              <div style={{ background:`${difColor}12`, borderRadius:10, padding:'12px 14px', border:`1px solid ${difColor}35` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:800, color:difColor }}>Diferans:</span>
                  <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:18, color:difColor }}>{diferans>=0?'+':''}{fmt(diferans)} HTG</span>
                </div>
                <p style={{ fontSize:11, color:D.muted, margin:'3px 0 0' }}>{difLabel}</p>
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button className="ke-btn" onClick={() => setEtap(1)} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>← Retou</button>
              <button className="ke-btn" onClick={handleFemen} disabled={loading||!hasMontant}
                style={{ flex:2, padding:'13px', borderRadius:12, border:'none', cursor:loading||!hasMontant?'not-allowed':'pointer', background:'linear-gradient(135deg,#dc2626,#a00)', color:'#fff', fontWeight:800, fontSize:14, opacity:loading||!hasMontant?0.6:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                {loading ? <><Spinner/> Ap fèmen...</> : <><Lock size={15}/> Fèmen Kès Definitiv</>}
              </button>
            </div>
          </>
        )}
        {rapo && (
          <>
            <div style={{ background:D.greenBg, border:`1px solid ${D.green}30`, borderRadius:12, padding:'14px', textAlign:'center' }}>
              <CheckCircle size={28} style={{ color:D.green, margin:'0 auto 8px', display:'block' }}/>
              <p style={{ fontSize:15, fontWeight:800, color:D.green, margin:'0 0 4px' }}>Kès Fèmen ✅</p>
            </div>
            <button className="ke-btn" onClick={onClose} style={{ padding:'13px', borderRadius:12, border:'none', background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:14, cursor:'pointer' }}>Fèmen</button>
          </>
        )}
      </div>
    </Modal>
  )
}