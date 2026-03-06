// src/pages/enterprise/KanePage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CreditCard, Plus, Printer, Search, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

const T = {
  ht: {
    title: 'Ti Kanè Kès', subtitle: 'Rekèt lajan rapid ak reçu kès',
    newKane: 'Nouvo Kont Kanè Epay', search: 'Chèche...',
    all: 'Tout', pending: 'Annatant', paid: 'Peye', cancelled: 'Anile',
    amount: 'Montan', currency: 'Monè', clientPhone: 'Telefòn Kliyan', notes: 'Nòt',
    create: 'Kreye + Enprime Resi', cancel: 'Anile',
    print: 'Enprime', markPaid: 'Mete Peye', markCancelled: 'Anile Kanè',
    noKane: 'Pa gen kanè. Kreye premye kanè ou a!',
    kaneNum: 'Nimewo', totalToday: 'Total Jodi a', totalPaid: 'Total Peye', totalPending: 'Annatant',
    confirmPaid: 'Mete kanè sa a kòm peye?', confirmCancel: 'Anile kanè sa a?',
    receiptTitle: 'REÇU KÈS', receiptCashier: 'Kasye', receiptTotal: 'TOTAL', receiptThanks: 'Mèsi pou achte ou!',
    apiError: 'Erè koneksyon ak sèvè a.',
    sectionInfo: 'ENFÒMASYON TITILÈ', sectionAmount: 'MONTAN OUVERTURE', sectionFamily: 'REFERANS FANMI',
    firstName: 'PRENON', lastName: 'NON', nif: 'NIF / CIN', address: 'ADRÈS',
    openingAmount: 'MONTAN TOTAL KLIYAN DEPOZE',
    paymentMethod: 'METOD PEMAN', reference: 'REFERANS (OPSYONÈL)',
    familyName: 'NON REFERANS', familyRelation: 'RELASYON', selectRelation: '— Chwazi relasyon —',
  },
  fr: {
    title: 'Petit Bon de Caisse', subtitle: 'Demandes de paiement rapide et reçus',
    newKane: 'Nouveau Compte Kanè Epay', search: 'Rechercher...',
    all: 'Tous', pending: 'En attente', paid: 'Payé', cancelled: 'Annulé',
    amount: 'Montant', currency: 'Devise', clientPhone: 'Téléphone', notes: 'Notes',
    create: 'Créer + Imprimer Reçu', cancel: 'Annuler',
    print: 'Imprimer', markPaid: 'Marquer Payé', markCancelled: 'Annuler Bon',
    noKane: 'Aucun bon. Créez votre premier bon!',
    kaneNum: 'Numéro', totalToday: "Total Aujourd'hui", totalPaid: 'Total Payé', totalPending: 'En attente',
    confirmPaid: 'Marquer ce bon comme payé?', confirmCancel: 'Annuler ce bon?',
    receiptTitle: 'REÇU DE CAISSE', receiptCashier: 'Caissier', receiptTotal: 'TOTAL', receiptThanks: 'Merci pour votre achat!',
    apiError: 'Erreur de connexion au serveur.',
    sectionInfo: 'INFORMATIONS DU TITULAIRE', sectionAmount: "MONTANT D'OUVERTURE", sectionFamily: 'RÉFÉRENCE FAMILIALE',
    firstName: 'PRÉNOM', lastName: 'NOM', nif: 'NIF / CIN', address: 'ADRESSE',
    openingAmount: 'MONTANT TOTAL DÉPOSÉ PAR LE CLIENT',
    paymentMethod: 'MÉTHODE DE PAIEMENT', reference: 'RÉFÉRENCE (OPTIONNEL)',
    familyName: 'NOM DE LA RÉFÉRENCE', familyRelation: 'RELATION', selectRelation: '— Sélectionner —',
  },
  en: {
    title: 'Cash Voucher', subtitle: 'Quick payment requests and cash receipts',
    newKane: 'New Kanè Epay Account', search: 'Search...',
    all: 'All', pending: 'Pending', paid: 'Paid', cancelled: 'Cancelled',
    amount: 'Amount', currency: 'Currency', clientPhone: 'Phone', notes: 'Notes',
    create: 'Create + Print Receipt', cancel: 'Cancel',
    print: 'Print', markPaid: 'Mark Paid', markCancelled: 'Cancel Voucher',
    noKane: 'No vouchers yet. Create your first one!',
    kaneNum: 'Number', totalToday: 'Today Total', totalPaid: 'Total Paid', totalPending: 'Pending',
    confirmPaid: 'Mark this voucher as paid?', confirmCancel: 'Cancel this voucher?',
    receiptTitle: 'CASH RECEIPT', receiptCashier: 'Cashier', receiptTotal: 'TOTAL', receiptThanks: 'Thank you for your purchase!',
    apiError: 'Server connection error.',
    sectionInfo: 'ACCOUNT HOLDER INFORMATION', sectionAmount: 'OPENING AMOUNT', sectionFamily: 'FAMILY REFERENCE',
    firstName: 'FIRST NAME', lastName: 'LAST NAME', nif: 'NIF / CIN', address: 'ADDRESS',
    openingAmount: 'TOTAL AMOUNT DEPOSITED BY CLIENT',
    paymentMethod: 'PAYMENT METHOD', reference: 'REFERENCE (OPTIONAL)',
    familyName: 'REFERENCE NAME', familyRelation: 'RELATIONSHIP', selectRelation: '— Select relationship —',
  }
}

const FAMILY_RELATIONS = {
  ht: ['Manman','Papa','Sè','Frè','Kouzen','Kouzin','Madanm','Mari','Bofis','Bofre','Belmè','Belsè','Grann','Granpap','Pitit Fi','Pitit Gason','Tonton','Tante'],
  fr: ['Mère','Père','Sœur','Frère','Cousin','Cousine','Femme','Mari','Beau-fils','Beau-frère','Belle-mère','Belle-sœur','Grand-mère','Grand-père','Fille','Fils','Oncle','Tante'],
  en: ['Mother','Father','Sister','Brother','Cousin (M)','Cousin (F)','Wife','Husband','Son-in-law','Brother-in-law','Mother-in-law','Sister-in-law','Grandmother','Grandfather','Daughter','Son','Uncle','Aunt'],
}
const METHODS = { ht:['Kach','MonCash','NatCash','Chèk','Virement'], fr:['Espèces','MonCash','NatCash','Chèque','Virement'], en:['Cash','MonCash','NatCash','Check','Transfer'] }

const C = {
  card:'#0d1b2a', cardBorder:'rgba(201,168,76,0.18)',
  input:'#060f1e', inputBorder:'rgba(255,255,255,0.09)',
  gold:'#C9A84C', goldBtn:'linear-gradient(135deg,#C9A84C,#8B6914)',
  label:'rgba(201,168,76,0.7)', muted:'#6b7a99', text:'#e8eaf0',
  secBg:'rgba(201,168,76,0.04)', secBorder:'rgba(201,168,76,0.11)',
}

const STATUS_STYLE = {
  pending:  { bg:'rgba(201,168,76,0.15)', color:'#C9A84C' },
  paid:     { bg:'rgba(39,174,96,0.15)',  color:'#27ae60' },
  cancelled:{ bg:'rgba(192,57,43,0.15)', color:'#C0392B' },
}

function printKane(kane, tenant, t) {
  if (!kane) return
  const w = window.open('', '_blank', 'width=320,height=600')
  if (!w) return
  const d = kane.createdAt ? new Date(kane.createdAt) : new Date()
  const amt = Number(kane.amount||0).toLocaleString('fr-HT')
  w.document.write(`<html><head><title>Reçu</title><style>body{font-family:monospace;font-size:13px;padding:10px;max-width:280px}.c{text-align:center}.b{font-weight:bold}.l{border-top:1px dashed #000;margin:8px 0}.t{font-size:18px;font-weight:bold}.r{display:flex;justify-content:space-between;margin:4px 0}</style></head><body>
    <div class="c b" style="font-size:16px">${tenant?.name||'PLUS GROUP'}</div>
    <div class="c" style="font-size:11px">${tenant?.address||''}</div>
    <div class="l"></div>
    <div class="c b">${t.receiptTitle}</div>
    <div class="c" style="font-size:11px">#${kane.kaneNumber||'—'} · ${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR')}</div>
    <div class="l"></div>
    <div class="r"><span>${t.firstName}:</span><span>${kane.firstName||''} ${kane.lastName||''}</span></div>
    <div class="r"><span>Tel:</span><span>${kane.clientPhone||'—'}</span></div>
    <div class="r"><span>NIF:</span><span>${kane.nif||'—'}</span></div>
    ${kane.familyRelation?`<div class="r"><span>${t.familyRelation}:</span><span>${kane.familyRelation} — ${kane.familyName||''}</span></div>`:''}
    <div class="l"></div>
    <div class="r"><span class="b t">${t.receiptTotal}:</span><span class="b t">${amt} ${kane.currency||'HTG'}</span></div>
    <div class="l"></div>
    <div class="r"><span>${t.receiptCashier}:</span><span>${kane.cashierName||'—'}</span></div>
    <div class="l"></div>
    <div class="c" style="font-size:11px">${t.receiptThanks}</div>
    <div class="c" style="font-size:10px;margin-top:8px">Powered by PLUS GROUP</div>
    </body></html>`)
  w.document.close(); w.print()
}

// ── Champ wrapper
const Field = ({ label, half, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5, flex: half ? '1 1 calc(50% - 5px)' : '1 1 100%', minWidth: half ? 120 : 0 }}>
    <label style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', color:C.label }}>{label}</label>
    {children}
  </div>
)

const baseInput = {
  padding:'10px 13px', borderRadius:8, fontSize:13, fontFamily:'inherit',
  background:C.input, border:`1px solid ${C.inputBorder}`, color:C.text,
  outline:'none', width:'100%', boxSizing:'border-box', transition:'border-color 0.18s, box-shadow 0.18s',
}

// ── Seksyon
const Section = ({ icon, title, children }) => (
  <div style={{ background:C.secBg, border:`1px solid ${C.secBorder}`, borderRadius:10, padding:'14px 13px' }}>
    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
      <span>{icon}</span>
      <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', color:C.gold }}>{title}</span>
    </div>
    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>{children}</div>
  </div>
)

function KaneModal({ lang, tenant, onClose, onSave }) {
  const t         = T[lang] || T.ht
  const relations = FAMILY_RELATIONS[lang] || FAMILY_RELATIONS.ht
  const methods   = METHODS[lang] || METHODS.ht

  const [form, setForm] = useState({
    firstName:'', lastName:'', nif:'', clientPhone:'', address:'',
    amount:'', currency: tenant?.defaultCurrency||'HTG',
    paymentMethod: methods[0], reference:'', notes:'',
    familyRelation:'', familyName:'',
  })
  const [focus, setFocus] = useState(null)
  const set = (k,v) => setForm(f => ({...f, [k]:v}))

  const inp = (key, extra={}) => ({
    ...baseInput,
    ...(focus===key ? { borderColor:C.gold, boxShadow:'0 0 0 2px rgba(201,168,76,0.14)' } : {}),
    ...extra,
    onFocus: () => setFocus(key),
    onBlur:  () => setFocus(null),
  })

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, padding:16, backdropFilter:'blur(3px)',
    }}>
      <style>{`
        .ks::-webkit-scrollbar{width:3px}
        .ks::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.25);border-radius:2px}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        .ks input::placeholder,.ks textarea::placeholder{color:#2a3a54}
        .ks select option{background:#0d1b2a;color:#e8eaf0}
      `}</style>

      <div style={{
        background:C.card, border:`1px solid ${C.cardBorder}`,
        borderRadius:18, width:'100%', maxWidth:490,
        maxHeight:'92vh', display:'flex', flexDirection:'column',
        boxShadow:'0 28px 80px rgba(0,0,0,0.75)', overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px', borderBottom:`1px solid ${C.cardBorder}`,
          background:'linear-gradient(135deg,rgba(201,168,76,0.07),transparent)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:C.goldBtn, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CreditCard size={17} color="#0a1222" />
            </div>
            <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>+ {t.newKane}</span>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.06)', border:'none', color:C.muted,
            cursor:'pointer', width:30, height:30, borderRadius:8,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}><X size={15}/></button>
        </div>

        {/* Scrollable body */}
        <div className="ks" style={{ overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>

          <Section icon="👤" title={t.sectionInfo}>
            <Field label={`${t.firstName} *`} half>
              <input value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="Fredelyn" style={inp('firstName')} />
            </Field>
            <Field label={`${t.lastName} *`} half>
              <input value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Jean" style={inp('lastName')} />
            </Field>
            <Field label={t.nif} half>
              <input value={form.nif} onChange={e=>set('nif',e.target.value)} placeholder="001-234-5678" style={inp('nif')} />
            </Field>
            <Field label={t.clientPhone} half>
              <input value={form.clientPhone} onChange={e=>set('clientPhone',e.target.value)} placeholder="+509 XXXX XXXX" style={inp('phone')} />
            </Field>
            <Field label={t.address}>
              <input value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Vil, Depatman..." style={inp('address')} />
            </Field>
          </Section>

          <Section icon="👨‍👩‍👧" title={t.sectionFamily}>
            <Field label={t.familyRelation} half>
              <select value={form.familyRelation} onChange={e=>set('familyRelation',e.target.value)}
                style={{...inp('rel'), cursor:'pointer'}}>
                <option value="">{t.selectRelation}</option>
                {relations.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={t.familyName} half>
              <input value={form.familyName} onChange={e=>set('familyName',e.target.value)} placeholder="Non referans lan..." style={inp('familyName')} />
            </Field>
          </Section>

          <Section icon="💰" title={t.sectionAmount}>
            <Field label={`${t.openingAmount} *`}>
              <div style={{ position:'relative' }}>
                <input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)}
                  placeholder="0.00"
                  style={{ ...inp('amount'), fontSize:22, fontWeight:800, textAlign:'center', color:C.gold, paddingRight:64 }} />
                <select value={form.currency} onChange={e=>set('currency',e.target.value)}
                  style={{ position:'absolute', right:0, top:0, bottom:0, width:62,
                    border:'none', borderLeft:`1px solid ${C.inputBorder}`,
                    background:'#060f1e', color:C.gold, fontWeight:700, fontSize:11,
                    borderRadius:'0 8px 8px 0', cursor:'pointer', outline:'none' }}>
                  <option value="HTG">HTG</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </Field>
            <Field label={t.paymentMethod} half>
              <select value={form.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)}
                style={{...inp('method'), cursor:'pointer'}}>
                {methods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label={t.reference} half>
              <input value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="MCash #12345" style={inp('ref')} />
            </Field>
            <Field label={t.notes}>
              <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2}
                placeholder="Nòt adisyonèl..."
                style={{...inp('notes'), resize:'none', lineHeight:1.5}} />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          padding:'13px 20px', borderTop:`1px solid ${C.cardBorder}`,
          display:'flex', gap:10, flexShrink:0, background:'rgba(6,13,26,0.6)',
        }}>
          <button onClick={onClose} style={{
            flex:1, padding:'11px', borderRadius:10,
            border:`1px solid rgba(255,255,255,0.1)`,
            background:'transparent', color:C.muted, cursor:'pointer', fontWeight:600, fontSize:13,
          }}>{t.cancel}</button>
          <button onClick={() => {
            if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('Prenon ak non obligatwa.')
            if (!form.amount || Number(form.amount) <= 0) return toast.error('Montan obligatwa.')
            onSave({
              ...form,
              clientName:  `${form.firstName} ${form.lastName}`.trim(),
              description: `Kont Kanè Epay — ${form.firstName} ${form.lastName}`.trim(),
            })
          }} style={{
            flex:2, padding:'11px', borderRadius:10, border:'none',
            background:C.goldBtn, color:'#0a1222',
            cursor:'pointer', fontWeight:800, fontSize:13,
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow:'0 4px 16px rgba(201,168,76,0.28)',
          }}>
            <Printer size={14}/> {t.create}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KanePage() {
  const { tenant } = useAuthStore()
  const lang = tenant?.defaultLanguage || 'ht'
  const t    = T[lang] || T.ht
  const qc   = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['kane', filter],
    queryFn:  () => api.get('/kane', { params: { status: filter !== 'all' ? filter : undefined } }).then(r => r.data),
    retry: 1,
    placeholderData: { kanes:[], stats:{ totalToday:0, totalPaid:0, totalPending:0 } },
  })

  const kanes = Array.isArray(data?.kanes)
    ? data.kanes.filter(k => !search
        || k?.description?.toLowerCase().includes(search.toLowerCase())
        || k?.clientName?.toLowerCase().includes(search.toLowerCase())
        || k?.kaneNumber?.toLowerCase().includes(search.toLowerCase()))
    : []

  const stats = data?.stats || { totalToday:0, totalPaid:0, totalPending:0 }

  const createMutation = useMutation({
    mutationFn: form => api.post('/kane', form),
    onSuccess: res => {
      toast.success('Kanè kreye!')
      qc.invalidateQueries({ queryKey:['kane'] })
      setShowModal(false)
      if (res?.data?.kane) printKane(res.data.kane, tenant, t)
    },
    onError: err => toast.error(err?.response?.data?.message || 'Erè kreye kanè')
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/kane/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['kane'] }); toast.success('Statut ajou!') },
    onError: err => toast.error(err?.response?.data?.message || 'Erè')
  })

  const cardStyle = { background:'rgba(13,27,42,0.7)', border:`1px solid ${C.cardBorder}`, borderRadius:10, padding:16, textAlign:'center' }

  return (
    <div style={{ padding:'24px', maxWidth:900, margin:'0 auto', fontFamily:'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ color:C.gold, margin:0, fontSize:22, display:'flex', alignItems:'center', gap:8 }}>
            <CreditCard size={22}/>{t.title}
          </h1>
          <p style={{ color:C.muted, margin:'4px 0 0', fontSize:13 }}>{t.subtitle}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>refetch()} style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${C.cardBorder}`, background:'transparent', color:C.muted, cursor:'pointer' }}>
            <RefreshCw size={14}/>
          </button>
          <button onClick={()=>setShowModal(true)} style={{
            padding:'9px 18px', borderRadius:10, border:'none', cursor:'pointer',
            background:C.goldBtn, color:'#0a1222', fontWeight:800, fontSize:13,
            display:'flex', alignItems:'center', gap:6, boxShadow:'0 4px 16px rgba(201,168,76,0.22)',
          }}>
            <Plus size={15}/>{t.newKane}
          </button>
        </div>
      </div>

      {isError && (
        <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.3)', color:'#C0392B', fontSize:13 }}>
          ⚠️ {t.apiError} — {error?.response?.data?.message||error?.message}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:t.totalToday,   val:`${Number(stats.totalToday||0).toLocaleString('fr-HT')} HTG`,   color:C.gold     },
          { label:t.totalPaid,    val:`${Number(stats.totalPaid||0).toLocaleString('fr-HT')} HTG`,    color:'#27ae60'  },
          { label:t.totalPending, val:`${Number(stats.totalPending||0).toLocaleString('fr-HT')} HTG`, color:'#C9A84C'  },
        ].map(({label,val,color}) => (
          <div key={label} style={cardStyle}>
            <div style={{ color, fontWeight:800, fontSize:18 }}>{val}</div>
            <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}
            style={{ width:'100%', padding:'8px 10px 8px 32px', borderRadius:8, fontSize:13, background:'rgba(13,27,42,0.7)', border:`1px solid ${C.cardBorder}`, color:'#fff', boxSizing:'border-box' }}/>
        </div>
        {['all','pending','paid','cancelled'].map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{
            padding:'8px 14px', borderRadius:8,
            border:`1px solid ${filter===s?C.gold:'rgba(255,255,255,0.07)'}`,
            background: filter===s ? 'rgba(201,168,76,0.1)' : 'transparent',
            color: filter===s ? C.gold : C.muted,
            cursor:'pointer', fontSize:12, fontWeight: filter===s ? 700 : 400,
          }}>{t[s]}</button>
        ))}
      </div>

      {/* Lis */}
      {isLoading ? (
        <div style={{ textAlign:'center', color:C.muted, padding:60 }}>Chajman...</div>
      ) : kanes.length === 0 ? (
        <div style={{ textAlign:'center', color:C.muted, padding:60, background:'rgba(13,27,42,0.5)', borderRadius:12, border:`1px dashed ${C.cardBorder}` }}>
          <CreditCard size={40} color="#334155" style={{ marginBottom:12 }}/>
          <p style={{ margin:0 }}>{t.noKane}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {kanes.map((kane, idx) => {
            if (!kane) return null
            const ss = STATUS_STYLE[kane.status] || STATUS_STYLE.pending
            return (
              <div key={kane.id??`k-${idx}`} style={{
                background:'rgba(13,27,42,0.7)', border:`1px solid ${C.cardBorder}`,
                borderRadius:10, padding:'12px 16px',
                display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
              }}>
                <div style={{ minWidth:85 }}>
                  <div style={{ color:C.muted, fontSize:10 }}>{t.kaneNum}</div>
                  <div style={{ color:C.gold, fontWeight:700, fontFamily:'monospace', fontSize:13 }}>#{kane.kaneNumber||'KNE-001'}</div>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <div style={{ color:'#fff', fontWeight:600, fontSize:14 }}>{kane.description||'—'}</div>
                  {kane.clientName && (
                    <div style={{ color:'#94a3b8', fontSize:12 }}>
                      {kane.clientName}{kane.clientPhone ? ` · ${kane.clientPhone}` : ''}
                      {kane.familyRelation ? ` · ${kane.familyRelation}: ${kane.familyName||''}` : ''}
                    </div>
                  )}
                </div>
                <div style={{ minWidth:100, textAlign:'right' }}>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{Number(kane.amount||0).toLocaleString('fr-HT')}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>{kane.currency||'HTG'}</div>
                </div>
                <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:ss.bg, color:ss.color, minWidth:70, textAlign:'center' }}>
                  {t[kane.status]||kane.status}
                </span>
                <div style={{ color:C.muted, fontSize:11, minWidth:70 }}>
                  {kane.createdAt ? new Date(kane.createdAt).toLocaleDateString('fr-FR') : '—'}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>printKane(kane,tenant,t)} style={{ padding:'6px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.05)', color:'#94a3b8' }}><Printer size={13}/></button>
                  {kane.status==='pending' && (<>
                    <button onClick={()=>window.confirm(t.confirmPaid)&&statusMutation.mutate({id:kane.id,status:'paid'})}
                      disabled={statusMutation.isPending}
                      style={{ padding:'6px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'rgba(39,174,96,0.12)', color:'#27ae60' }}>
                      <CheckCircle size={13}/>
                    </button>
                    <button onClick={()=>window.confirm(t.confirmCancel)&&statusMutation.mutate({id:kane.id,status:'cancelled'})}
                      disabled={statusMutation.isPending}
                      style={{ padding:'6px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'rgba(192,57,43,0.1)', color:'#C0392B' }}>
                      <XCircle size={13}/>
                    </button>
                  </>)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <KaneModal lang={lang} tenant={tenant} onClose={()=>setShowModal(false)} onSave={form=>createMutation.mutate(form)} />
      )}
    </div>
  )
}