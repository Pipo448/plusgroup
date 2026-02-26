// src/pages/dashboard/Dashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, productAPI, reportAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Link } from 'react-router-dom'
import {
  Receipt, Package, AlertTriangle, TrendingUp,
  ArrowRight, CheckCircle2, Clock, Plus, Crown,
  CreditCard, X, ChevronRight, Bell
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.14)',
  gold:'#C9A84C', goldLt:'#F0D080', goldDk:'#8B6914',
  goldDim:'rgba(201,168,76,0.12)',
  red:'#C0392B', redLt:'#E74C3C', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
  shadowLg:'0 8px 32px rgba(27,42,143,0.16)',
}

// ── Konstant peman ──
const WHATSAPP_NUMBER = '50942449024'
const PAYMENT_METHODS = [
  { id:'moncash',     label:'MonCash',     color:'#E53935', logo:'📱', info:'Voye lajan sou nimewo MonCash nou an' },
  { id:'natcash',     label:'NatCash',     color:'#1B5E20', logo:'📲', info:'Voye lajan sou nimewo NatCash nou an' },
  { id:'sogebanking', label:'Sogebanking', color:'#0D47A1', logo:'🏦', info:'Virement bancaire Sogebank' },
  { id:'buh',         label:'BUH',         color:'#4A148C', logo:'🏛️', info:'Virement bancaire BUH' },
]

const fmt = (n) => Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:2,maximumFractionDigits:2})

const CURRENCY_SYMBOLS = { USD:'$', DOP:'RD$', EUR:'€', CAD:'CA$' }

const convertFromHTG = (amountHTG, currency, exchangeRates={}) => {
  const rateToHTG = Number(exchangeRates[currency]||0)
  if (!rateToHTG) return null
  return { amount: amountHTG/rateToHTG, symbol: CURRENCY_SYMBOLS[currency]||currency, currency }
}

const fmtConv = (amountHTG, exchangeRates, visibleCurrencies=[]) => {
  if (!visibleCurrencies.length) return null
  const parts = visibleCurrencies
    .map(cur => convertFromHTG(amountHTG, cur, exchangeRates))
    .filter(Boolean)
    .map(c => `≈ ${c.symbol}${fmt(c.amount)}`)
  return parts.length ? parts.join('  ') : null
}

// ══════════════════════════════════════════════════
// TICKER — Mesaj ki defile anba
// ══════════════════════════════════════════════════
const TickerBanner = () => {
  const msg = "💳 Pou renouvle abònman ou — Voye peman via MonCash, NatCash, Sogebanking oswa BUH ✦ Apre peman an, pran yon screenshot epi voye l nou sou WhatsApp +509 4244 9024 ✦ Ekip PLUS GROUP ap konfime abònman ou nan 24 è ✦ Ou ka vizite biwo nou nan Ouanaminthe si ou pa kapab fè peman an sou entènèt ✦ Mèsi pou konfyans ou nan PLUS GROUP — Inovasyon & Teknoloji ✦ "
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:1000,
      background:'linear-gradient(90deg, #0F1A5C, #1B2A8F 30%, #8B0000 70%, #0F1A5C)',
      borderTop:'1px solid rgba(201,168,76,0.35)',
      height:30, overflow:'hidden', display:'flex', alignItems:'center',
      boxShadow:'0 -4px 20px rgba(0,0,0,0.25)'
    }}>
      <div style={{
        display:'flex', alignItems:'center',
        whiteSpace:'nowrap',
        animation:'ticker 40s linear infinite',
        willChange:'transform'
      }}>
        {[msg, msg, msg].map((m, i) => (
          <span key={i} style={{
            color:'#C9A84C', fontSize:11, fontWeight:600,
            letterSpacing:'0.05em', fontFamily:'DM Sans, sans-serif',
            paddingRight:60, flexShrink:0
          }}>{m}</span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0) }
          100% { transform: translateX(-33.333%) }
        }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════
// MODAL PEMAN ABÒNMAN
// ══════════════════════════════════════════════════
const PaymentModal = ({ tenant, onClose }) => {
  const [step, setStep]       = useState(1)
  const [method, setMethod]   = useState(null)
  const [form, setForm]       = useState({ accountNumber:'', fullName:'', screenshot:null })
  const [preview, setPreview] = useState(null)
  const [sending, setSending] = useState(false)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setForm(p => ({ ...p, screenshot: f }))
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const handleSend = async () => {
    if (!form.accountNumber.trim() || !form.fullName.trim()) {
      alert('Tanpri ranpli tout chan obligatwa yo!')
      return
    }
    setSending(true)

    const planName = tenant?.plan?.name || tenant?.planName || 'Plan'
    const msg = encodeURIComponent(
      `🏢 *PLUS GROUP — Demann Renouvèlman Abònman*\n\n` +
      `📋 *Entreprise:* ${tenant?.name || 'N/A'}\n` +
      `📦 *Plan:* ${planName}\n` +
      `💳 *Metòd Peman:* ${method?.label}\n` +
      `👤 *Non Konplè:* ${form.fullName}\n` +
      `📞 *Nimewo / Kont:* ${form.accountNumber}\n` +
      `📅 *Dat Demann:* ${new Date().toLocaleDateString('fr-FR')}\n\n` +
      `📸 *Screenshot tranzaksyon an ap swiv nan pwochen mesaj la.*\n\n` +
      `✅ Mèsi pou konfyans nou nan PLUS GROUP!`
    )

    await new Promise(r => setTimeout(r, 1400))
    setSending(false)
    setStep(3)

    setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
    }, 1200)
  }

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(15,26,92,0.85)',
      backdropFilter:'blur(8px)',
      zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16
    }} onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{
        background:'linear-gradient(160deg, #0f1923 0%, #0d1117 100%)',
        borderRadius:24, width:'100%', maxWidth:460,
        border:'1px solid rgba(201,168,76,0.25)',
        boxShadow:'0 40px 120px rgba(0,0,0,0.8)',
        position:'relative', overflow:'hidden',
        maxHeight:'94vh', overflowY:'auto'
      }}>
        {/* Bò lò anlè */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
          background:'linear-gradient(90deg, transparent, #C9A84C 35%, #8B0000 65%, transparent)',
          borderRadius:'24px 24px 0 0' }}/>

        {/* Header modal */}
        <div style={{
          padding:'22px 24px 18px',
          borderBottom:'1px solid rgba(201,168,76,0.08)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'rgba(0,0,0,0.2)'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12,
              background:'linear-gradient(135deg, #C9A84C, #8B0000)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(201,168,76,0.35)'
            }}>
              <CreditCard size={18} color="#fff"/>
            </div>
            <div>
              <h3 style={{ color:'#fff', margin:0, fontSize:15,
                fontFamily:"'Playfair Display', 'Georgia', serif", fontWeight:700 }}>
                Renouvle Abònman
              </h3>
              <p style={{ color:'rgba(201,168,76,0.55)', fontSize:10, margin:0, letterSpacing:'0.05em' }}>
                {step === 1 ? 'Chwazi metòd peman ou' : step === 2 ? `Peman via ${method?.label}` : '✓ Demann voye avèk siksè'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:8, width:30, height:30,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'rgba(255,255,255,0.4)', flexShrink:0
          }}><X size={14}/></button>
        </div>

        <div style={{ padding:24 }}>

          {/* ── STEP 1: Chwazi metòd ── */}
          {step === 1 && (
            <div>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:'0 0 18px', lineHeight:1.65 }}>
                Chwazi metòd peman pou renouvle abònman{' '}
                <strong style={{ color:'#C9A84C' }}>
                  {tenant?.plan?.name || tenant?.planName || 'ou a'}
                </strong>.
                Apre peman an, ou pral voye yon screenshot konfirmasyon.
              </p>

              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id}
                    onClick={() => { setMethod(m); setStep(2) }}
                    style={{
                      padding:'14px 18px', borderRadius:14, cursor:'pointer',
                      background:'rgba(255,255,255,0.03)',
                      border:'1px solid rgba(255,255,255,0.08)',
                      color:'#fff', textAlign:'left', transition:'all 0.18s',
                      display:'flex', alignItems:'center', gap:14,
                      fontFamily:'DM Sans, sans-serif'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${m.color}15`
                      e.currentTarget.style.borderColor = `${m.color}55`
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div style={{
                      width:44, height:44, borderRadius:12,
                      background:`${m.color}22`, border:`1px solid ${m.color}44`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:22, flexShrink:0
                    }}>{m.logo}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:14, margin:'0 0 3px' }}>{m.label}</p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:0 }}>{m.info}</p>
                    </div>
                    <ChevronRight size={16} color="rgba(255,255,255,0.25)"/>
                  </button>
                ))}
              </div>

              {/* Ti nòt konsèy */}
              <div style={{
                padding:'13px 16px', borderRadius:12,
                background:'rgba(201,168,76,0.06)',
                border:'1px solid rgba(201,168,76,0.15)'
              }}>
                <p style={{ color:'rgba(201,168,76,0.75)', fontSize:11, margin:0, lineHeight:1.65 }}>
                  💡 <strong>Si ou pa kapab fè peman an sou entènèt:</strong> Vizite biwo
                  PLUS GROUP nan Ouanaminthe oswa kontakte nou dirèkteman sou WhatsApp{' '}
                  <strong style={{ color:'#C9A84C' }}>+509 4244 9024</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Fòmilè ── */}
          {step === 2 && (
            <div>
              {/* Bouton retounen */}
              <button onClick={() => setStep(1)} style={{
                background:'transparent', border:'none',
                color:'rgba(201,168,76,0.7)', cursor:'pointer',
                fontSize:12, padding:0, marginBottom:18,
                display:'flex', alignItems:'center', gap:5,
                fontFamily:'DM Sans, sans-serif', fontWeight:600
              }}>
                ← Tounen
              </button>

              {/* Badge metòd chwazi */}
              <div style={{
                display:'flex', alignItems:'center', gap:12, marginBottom:20,
                padding:'12px 16px', borderRadius:12,
                background:`${method?.color}18`, border:`1px solid ${method?.color}35`
              }}>
                <span style={{ fontSize:28 }}>{method?.logo}</span>
                <div>
                  <p style={{ color:'#fff', fontWeight:700, margin:'0 0 2px', fontFamily:'DM Sans, sans-serif', fontSize:14 }}>
                    {method?.label}
                  </p>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, margin:0 }}>
                    Ranpli enfòmasyon peman an epi voye screenshot
                  </p>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:15 }}>

                {/* Non Konplè */}
                <div>
                  <label style={{
                    display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700,
                    marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans, sans-serif'
                  }}>Non Konplè *</label>
                  <input
                    placeholder="Jean Pierre Baptiste"
                    value={form.fullName}
                    onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    style={{
                      width:'100%', padding:'11px 14px', borderRadius:10, boxSizing:'border-box',
                      background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                      color:'#fff', fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none'
                    }}
                    onFocus={e  => e.target.style.border = '1px solid rgba(201,168,76,0.55)'}
                    onBlur={e   => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  />
                </div>

                {/* Nimewo / Kont */}
                <div>
                  <label style={{
                    display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700,
                    marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans, sans-serif'
                  }}>
                    {method?.id === 'moncash' || method?.id === 'natcash'
                      ? 'Nimewo Telefòn *'
                      : 'Nimewo Kont Bancaire *'}
                  </label>
                  <input
                    placeholder={method?.id === 'moncash' || method?.id === 'natcash' ? '509-XXXX-XXXX' : 'XXXX-XXXX-XXXX'}
                    value={form.accountNumber}
                    onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))}
                    style={{
                      width:'100%', padding:'11px 14px', borderRadius:10, boxSizing:'border-box',
                      background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                      color:'#fff', fontSize:13, fontFamily:'monospace', outline:'none', letterSpacing:'0.05em'
                    }}
                    onFocus={e  => e.target.style.border = '1px solid rgba(201,168,76,0.55)'}
                    onBlur={e   => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  />
                </div>

                {/* Upload Screenshot */}
                <div>
                  <label style={{
                    display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700,
                    marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans, sans-serif'
                  }}>Screenshot Konfirmasyon *</label>
                  <label style={{
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    padding: preview ? '8px' : '24px 16px',
                    borderRadius:12, cursor:'pointer',
                    background: preview ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.03)',
                    border:`2px dashed ${preview ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    transition:'all 0.2s', position:'relative',
                    overflow:'hidden', minHeight: preview ? 'auto' : 100
                  }}>
                    <input type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
                    {preview ? (
                      <div style={{ width:'100%', position:'relative' }}>
                        <img src={preview} alt="screenshot"
                          style={{ width:'100%', maxHeight:200, objectFit:'contain', borderRadius:8, display:'block' }}/>
                        <div style={{
                          position:'absolute', bottom:6, right:6,
                          background:'rgba(201,168,76,0.85)', borderRadius:6,
                          padding:'3px 10px', fontSize:10, fontWeight:700, color:'#0f1923'
                        }}>✓ Screenshot chwazi · Klike pou chanje</div>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize:36, marginBottom:10 }}>📸</span>
                        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:0, textAlign:'center', fontFamily:'DM Sans, sans-serif' }}>
                          Klike pou chwazi screenshot tranzaksyon an
                        </p>
                        <p style={{ color:'rgba(255,255,255,0.2)', fontSize:10, margin:'5px 0 0', fontFamily:'DM Sans, sans-serif' }}>
                          PNG · JPG · WEBP
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Bouton voye */}
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  width:'100%', marginTop:20, padding:'13px',
                  borderRadius:12, border:'none',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  background: sending
                    ? 'rgba(201,168,76,0.25)'
                    : 'linear-gradient(135deg, #8B0000, #C0392B 50%, #C9A84C)',
                  color:'#fff', fontSize:14, fontWeight:700,
                  fontFamily:'DM Sans, sans-serif',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: sending ? 'none' : '0 4px 20px rgba(139,0,0,0.4)',
                  transition:'all 0.2s'
                }}
                onMouseEnter={e => { if (!sending) e.currentTarget.style.boxShadow = '0 6px 28px rgba(139,0,0,0.6)' }}
                onMouseLeave={e => { if (!sending) e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,0,0,0.4)' }}
              >
                {sending ? (
                  <>
                    <div style={{
                      width:16, height:16, border:'2px solid rgba(255,255,255,0.3)',
                      borderTopColor:'#fff', borderRadius:'50%',
                      animation:'spin 0.8s linear infinite'
                    }}/>
                    Ap prepare mesaj...
                  </>
                ) : (
                  <>📤 Voye sou WhatsApp</>
                )}
              </button>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── STEP 3: Siksè ── */}
          {step === 3 && (
            <div style={{ textAlign:'center', padding:'10px 0 6px' }}>
              <div style={{ fontSize:60, marginBottom:14, animation:'popIn 0.4s ease' }}>✅</div>
              <h3 style={{
                color:'#34d399', margin:'0 0 10px',
                fontFamily:"'Playfair Display', Georgia, serif", fontSize:18
              }}>
                Demann Voye!
              </h3>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, lineHeight:1.7, margin:'0 0 20px' }}>
                WhatsApp t ap ouvri otomatikman ak mesaj konfirmasyon an.<br/>
                Si li pa ouvri, kontakte nou dirèkteman sou:<br/>
                <strong style={{ color:'#C9A84C', fontSize:14 }}>+509 4244 9024</strong>
              </p>

              <div style={{
                padding:'14px 18px', borderRadius:12, marginBottom:20,
                background:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.2)'
              }}>
                <p style={{ color:'rgba(52,211,153,0.85)', fontSize:12, margin:0, lineHeight:1.65 }}>
                  ⏱ Ekip PLUS GROUP ap konfime epi aktive abònman ou nan{' '}
                  <strong>24 è</strong> apre yo resevwa peman an.
                </p>
              </div>

              <button onClick={onClose} style={{
                padding:'10px 32px', borderRadius:10,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(255,255,255,0.5)', cursor:'pointer',
                fontSize:13, fontFamily:'DM Sans, sans-serif', fontWeight:600
              }}>Fèmen</button>

              <style>{`@keyframes popIn { 0%{transform:scale(0.5);opacity:0} 80%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }`}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// STICKY PAYMENT BUTTON — Aliye ak bàr topbar la
// ══════════════════════════════════════════════════
const StickyPaymentButton = ({ onClick }) => (
  <div style={{
    position:'fixed', top:0, right:0, zIndex:998,
    height:46,
    display:'flex', alignItems:'center',
    paddingRight:16,
  }}>
    <button
      onClick={onClick}
      style={{
        display:'inline-flex', alignItems:'center', gap:7,
        padding:'7px 16px', borderRadius:8,
        background:'linear-gradient(135deg, #8B0000, #C0392B 55%, #C9A84C)',
        color:'#fff', border:'none',
        cursor:'pointer', fontSize:12, fontWeight:800,
        fontFamily:'DM Sans, sans-serif',
        boxShadow:'0 4px 18px rgba(139,0,0,0.45), 0 0 0 2px rgba(201,168,76,0.25)',
        animation:'pulseBtn 2.5s ease-in-out infinite',
        whiteSpace:'nowrap', letterSpacing:'0.02em'
      }}
    >
      <CreditCard size={14}/>
      Peye Abònman
    </button>
    <style>{`
      @keyframes pulseBtn {
        0%, 100% { box-shadow: 0 4px 18px rgba(139,0,0,0.45), 0 0 0 2px rgba(201,168,76,0.25); }
        50%       { box-shadow: 0 6px 26px rgba(139,0,0,0.65), 0 0 0 4px rgba(201,168,76,0.4); }
      }
    `}</style>
  </div>
)

// ══════════════════════════════════════════════════
// COMPOSANTS ENTÈN (pa chanje)
// ══════════════════════════════════════════════════
const CustomTooltip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{background:D.blueDk,borderRadius:12,padding:'10px 16px',border:`1px solid ${D.gold}40`,boxShadow:'0 8px 24px rgba(0,0,0,0.3)'}}>
      <p style={{color:D.gold,fontSize:10,fontWeight:800,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</p>
      <p style={{fontFamily:'monospace',fontWeight:800,color:'#fff',fontSize:14}}>
        {fmt(payload[0]?.value)} <span style={{color:D.gold,fontSize:10}}>HTG</span>
      </p>
    </div>
  )
}

const StatCard = ({ label, val, icon, color, sub }) => {
  const [hov,setHov] = useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background: hov?`${color}18`:'rgba(255,255,255,0.06)',
      border:`1px solid ${hov?color+'40':'rgba(255,255,255,0.12)'}`,
      borderRadius:14, padding:'14px 16px',
      transition:'all 0.25s ease',
      transform: hov?'translateY(-2px)':'none',
      boxShadow: hov?`0 8px 24px ${color}25`:'none',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <span style={{color,filter:hov?`drop-shadow(0 0 6px ${color})`:'none',transition:'filter 0.25s'}}>{icon}</span>
        <span style={{fontSize:10,fontWeight:800,color,textTransform:'uppercase',letterSpacing:'0.07em',opacity:0.9}}>{label}</span>
      </div>
      <p style={{fontFamily:'IBM Plex Mono,monospace',fontWeight:800,color:'#fff',fontSize:13,margin:0}}>{val}</p>
      {sub&&<p style={{fontSize:10,color:'rgba(255,255,255,0.4)',margin:'3px 0 0'}}>{sub}</p>}
    </div>
  )
}

const KpiCard = ({ label, value, count, icon, color, bg, link }) => {
  const [hov,setHov] = useState(false)
  return (
    <Link to={link} style={{textDecoration:'none'}}>
      <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
        background:hov?bg:D.white,
        border:`1px solid ${hov?color+'30':D.border}`,
        borderRadius:18, padding:'18px 16px',
        transition:'all 0.25s ease',
        transform:hov?'translateY(-3px)':'none',
        boxShadow:hov?`0 12px 32px ${color}25`:D.shadow,
        cursor:'pointer', height:'100%',
      }}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
          <div style={{
            width:44,height:44,borderRadius:12,flexShrink:0,
            background:`linear-gradient(135deg,${color},${color}CC)`,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:`0 4px 14px ${color}40`,
            transition:'transform 0.2s',
            transform:hov?'rotate(-6deg) scale(1.1)':'none',
          }}>
            <span style={{color:'#fff'}}>{icon}</span>
          </div>
          <ArrowRight size={14} style={{color:D.muted,opacity:hov?0.8:0.3,transform:hov?'translateX(3px)':'none',transition:'all 0.2s'}}/>
        </div>
        <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:D.muted,marginBottom:4}}>{label}</p>
        <p style={{fontFamily:'monospace',fontWeight:800,fontSize:15,color,margin:0}}>{value}</p>
        <p style={{fontSize:11,color:D.muted,margin:'3px 0 0',opacity:0.7}}>{count}</p>
      </div>
    </Link>
  )
}

// ══════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════
export default function Dashboard() {
  const { t } = useTranslation()
  const { user, tenant } = useAuthStore()

  // État modal peman
  const [showPayment, setShowPayment] = useState(false)

  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates     || {}
  const visibleCurrs  = tenant?.visibleCurrencies  || []

  const { data:dashboard }   = useQuery({ queryKey:['dashboard'],       queryFn:()=>invoiceAPI.getDashboard().then(r=>r.data.dashboard) })
  const { data:lowStock }    = useQuery({ queryKey:['low-stock'],        queryFn:()=>productAPI.getLowStock().then(r=>r.data.products) })
  const { data:salesReport } = useQuery({
    queryKey:['sales-report-dash'],
    queryFn:()=>reportAPI.getSales({ dateFrom:format(subDays(new Date(),30),'yyyy-MM-dd'), dateTo:format(new Date(),'yyyy-MM-dd') }).then(r=>r.data.report)
  })

  const chartData = Array.from({length:7},(_,i)=>{
    const d   = subDays(new Date(),6-i)
    const key = format(d,'yyyy-MM-dd')
    const found = salesReport?.daily?.find(x=>String(x.date).startsWith(key))
    return { date:format(d,'EEE',{locale:fr}), ventes:Number(found?.total_htg||0) }
  })

  const totalVentes = Number(salesReport?.totals?._sum?.totalHtg||0)
  const totalPaye   = Number(dashboard?.totalPaid?._sum?.totalHtg||0)
  const totalImpaye = Number(dashboard?.totalUnpaid?._sum?.totalHtg||0)
  const totalPasyal = Number(dashboard?.totalPartial?._sum?.balanceDueHtg||0)

  // Kalkile si abònman prèt ekspire
  const subBanner = (()=>{
    if (!tenant?.subscriptionEndsAt) return null
    const endsAt   = new Date(tenant.subscriptionEndsAt)
    const daysLeft = Math.ceil((endsAt-new Date())/86400000)
    if (daysLeft>5) return null
    return { expired:daysLeft<0, daysLeft, endsAt }
  })()

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20,fontFamily:'DM Sans,sans-serif',paddingBottom:40}}>

      {/* ── BOUTON PEMAN STICKY (toujou vizib) ── */}
      <StickyPaymentButton onClick={() => setShowPayment(true)} />

      {/* ── BANNER ALÈT ABÒNMAN (sèlman si <5 jou) ── */}
      {subBanner && (
        <div style={{
          borderRadius:16, padding:'14px 20px',
          display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
          background: subBanner.expired
            ? 'linear-gradient(135deg,#8B0000,#C0392B)'
            : 'linear-gradient(135deg,#8B6914,#C9A84C)',
          boxShadow: subBanner.expired
            ? '0 4px 20px rgba(192,57,43,0.35)'
            : '0 4px 20px rgba(201,168,76,0.35)',
          border:'1px solid rgba(255,255,255,0.15)',
          animation:'slideDown 0.3s ease'
        }}>
          <span style={{fontSize:24}}>{subBanner.expired ? '🔒' : '⏰'}</span>
          <div style={{flex:1}}>
            <p style={{color:'#fff',fontWeight:800,fontSize:13,margin:'0 0 2px'}}>
              {subBanner.expired
                ? t('dashboard.subscriptionExpired')
                : t('dashboard.subscriptionExpiring',{days:subBanner.daysLeft})}
            </p>
            <p style={{color:'rgba(255,255,255,0.75)',fontSize:11,margin:0}}>
              {t('dashboard.contactAdmin')}
            </p>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 18px', borderRadius:10,
              background:'rgba(255,255,255,0.95)', color:'#8B0000',
              border:'none', cursor:'pointer',
              fontSize:12, fontWeight:800, fontFamily:'DM Sans, sans-serif',
              boxShadow:'0 2px 12px rgba(0,0,0,0.2)', flexShrink:0
            }}
          >
            <CreditCard size={13}/> Renouvle Kounye a
          </button>
        </div>
      )}

      {/* ══ HERO BANNER ══ */}
      <div style={{
        borderRadius:24, padding:'28px', position:'relative', overflow:'hidden',
        background:`linear-gradient(145deg,${D.blueDk} 0%,${D.blue} 50%,${D.blueLt} 100%)`,
        boxShadow:`0 20px 60px rgba(27,42,143,0.35)`,
      }}>
        <div style={{position:'absolute',top:-60,right:-60,width:220,height:220,borderRadius:'50%',background:`radial-gradient(circle,${D.gold}25,transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-50,left:20,width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle,${D.red}20,transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${D.goldDk} 20%,${D.gold} 45%,${D.goldLt} 55%,${D.gold} 70%,${D.goldDk} 85%,transparent)`,animation:'shimmer 4s linear infinite',backgroundSize:'200% 100%'}}/>

        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16,marginBottom:22}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <Crown size={14} style={{color:D.gold,filter:`drop-shadow(0 0 6px ${D.gold})`}}/>
              <span style={{fontSize:10,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.12em',color:D.gold}}>
                {tenant?.name||'PLUS GROUP'} · {t('dashboard.tableBoard')}
              </span>
            </div>
            <h1 style={{fontSize:28,fontWeight:900,color:'#fff',margin:'0 0 6px'}}>
              {t('dashboard.greeting')}, {user?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',margin:0,textTransform:'capitalize'}}>
              {format(new Date(),'EEEE d MMMM yyyy',{locale:fr})}
            </p>
          </div>
          <Link to="/quotes/new" style={{
            display:'flex',alignItems:'center',gap:7,padding:'10px 20px',borderRadius:12,textDecoration:'none',
            background:`linear-gradient(135deg,${D.gold},${D.goldDk})`,
            color:'#0F1A5C',fontWeight:800,fontSize:12,letterSpacing:'0.03em',
            boxShadow:`0 4px 20px ${D.gold}50`,transition:'all 0.2s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05)';e.currentTarget.style.boxShadow=`0 8px 28px ${D.gold}70`}}
            onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow=`0 4px 20px ${D.gold}50`}}
          >
            <Plus size={14}/> {t('dashboard.newQuote')}
          </Link>
        </div>

        <div style={{position:'relative',zIndex:1,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          <StatCard label={t('dashboard.sales30days')} val={`${fmt(totalVentes)} HTG`} icon={<TrendingUp size={15}/>} color={D.gold}  sub={showRate&&fmtConv(totalVentes,exchangeRates,visibleCurrs)}/>
          <StatCard label={t('dashboard.paid')}        val={`${fmt(totalPaye)} HTG`}   icon={<CheckCircle2 size={15}/>} color="#34d399" sub={showRate&&fmtConv(totalPaye,exchangeRates,visibleCurrs)||`${dashboard?.totalPaid?._count||0} ${t('dashboard.invoices')}`}/>
          <StatCard label={t('dashboard.balance')}     val={`${fmt(totalImpaye)} HTG`} icon={<Clock size={15}/>}        color={D.redLt} sub={showRate&&fmtConv(totalImpaye,exchangeRates,visibleCurrs)||`${dashboard?.totalUnpaid?._count||0} ${t('dashboard.unpaid')}`}/>
          <StatCard label={t('dashboard.partial')}     val={`${fmt(totalPasyal)} HTG`} icon={<Receipt size={15}/>}      color="#93c5fd" sub={showRate&&fmtConv(totalPasyal,exchangeRates,visibleCurrs)||`${dashboard?.totalPartial?._count||0} ${t('dashboard.documents')}`}/>
        </div>
      </div>

      {/* ══ CHART + STOCK ══ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16}}>
        <div style={{background:D.white,borderRadius:20,padding:'20px 20px 14px',boxShadow:D.shadow,border:`1px solid ${D.border}`}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <div>
              <h3 style={{fontSize:15,fontWeight:800,color:D.text,margin:'0 0 2px'}}>{t('dashboard.sales7days')}</h3>
              <p style={{fontSize:11,color:D.muted,margin:0}}>{t('dashboard.salesChart')}</p>
            </div>
            <Link to="/reports" style={{
              display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:D.blue,
              textDecoration:'none',padding:'5px 12px',borderRadius:8,background:D.blueDim,border:`1px solid ${D.border}`,transition:'all 0.15s'
            }}
              onMouseEnter={e=>e.currentTarget.style.background=D.blueDim2}
              onMouseLeave={e=>e.currentTarget.style.background=D.blueDim}
            >
              {t('dashboard.seeReport')} <ArrowRight size={12}/>
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <BarChart data={chartData} barSize={28} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke={D.blueDim} vertical={false}/>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:11,fill:D.muted,fontFamily:'DM Sans',fontWeight:600}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:D.muted}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
              <Tooltip content={<CustomTooltip/>} cursor={{fill:`${D.blue}06`,radius:6}}/>
              <Bar dataKey="ventes" radius={[8,8,0,0]}>
                {chartData.map((entry,i)=>(
                  <Cell key={i} fill={entry.ventes===Math.max(...chartData.map(d=>d.ventes))&&entry.ventes>0?'url(#barGold)':'url(#barBlue)'}/>
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={D.gold}/><stop offset="100%" stopColor={D.goldDk}/>
                </linearGradient>
                <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={D.blueLt}/><stop offset="100%" stopColor={D.blue}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock alèt */}
        <div style={{background:D.white,borderRadius:20,padding:'20px',boxShadow:D.shadow,border:`1px solid ${D.border}`}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div>
              <h3 style={{fontSize:14,fontWeight:800,color:D.text,margin:'0 0 2px'}}>{t('dashboard.lowStock')}</h3>
              <p style={{fontSize:11,color:D.muted,margin:0}}>{t('dashboard.needRestock')}</p>
            </div>
            <Link to="/products" style={{
              fontSize:11,fontWeight:700,color:D.red,textDecoration:'none',
              display:'flex',alignItems:'center',gap:3,padding:'4px 10px',borderRadius:8,
              background:D.redDim,transition:'all 0.15s'
            }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,0.14)'}
              onMouseLeave={e=>e.currentTarget.style.background=D.redDim}
            >
              {t('dashboard.seeAll')} <ArrowRight size={12}/>
            </Link>
          </div>
          {!lowStock?.length
            ? <div style={{textAlign:'center',padding:'24px 0'}}>
                <div style={{width:44,height:44,borderRadius:14,background:D.successBg,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
                  <Package size={20} style={{color:D.success}}/>
                </div>
                <p style={{fontSize:12,fontWeight:700,color:D.success,margin:'0 0 2px'}}>{t('dashboard.stockOk')}</p>
                <p style={{fontSize:11,color:D.muted,margin:0}}>{t('dashboard.noAlerts')}</p>
              </div>
            : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {lowStock.slice(0,5).map(p=>(
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:'rgba(192,57,43,0.05)',border:`1px solid ${D.border}`}}>
                    <AlertTriangle size={13} style={{color:D.red,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:D.text,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
                      <p style={{fontSize:10,color:D.muted,margin:0,fontFamily:'monospace'}}>{p.code}</p>
                    </div>
                    <span style={{fontSize:11,fontFamily:'monospace',fontWeight:800,color:D.red,background:D.redDim,padding:'2px 8px',borderRadius:99,flexShrink:0}}>
                      {Number(p.quantity)}/{Number(p.alertThreshold)}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ══ 4 KPI CARDS ══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        <KpiCard label={t('dashboard.kpiFaktiImpaye')} value={`${fmt(totalImpaye)} HTG`} count={`${dashboard?.totalUnpaid?._count||0} ${t('dashboard.kpiFakti')}`}  icon={<Receipt size={20}/>}      color={D.red}     bg={D.redDim}               link="/invoices?status=unpaid"/>
        <KpiCard label={t('dashboard.kpiVantMwa')}     value={`${fmt(totalPaye)} HTG`}   count={`${dashboard?.totalPaid?._count||0} ${t('dashboard.kpiPeye')}`}     icon={<TrendingUp size={20}/>}   color={D.blue}    bg={D.blueDim}              link="/reports"/>
        <KpiCard label={t('dashboard.kpiPasyal')}      value={`${fmt(totalPasyal)} HTG`} count={`${dashboard?.totalPartial?._count||0} ${t('dashboard.kpiDocs')}`}  icon={<Clock size={20}/>}        color={D.gold}    bg={D.goldDim}              link="/invoices?status=partial"/>
        <KpiCard label={t('dashboard.kpiStock')}       value={`${lowStock?.length||0} ${t('dashboard.products')}`} count={t('dashboard.kpiRestock')} icon={<AlertTriangle size={20}/>} color={D.warning} bg="rgba(217,119,6,0.08)"   link="/products"/>
      </div>

      {/* ══ DÈNYE FAKTI ══ */}
      <div style={{background:D.white,borderRadius:20,overflow:'hidden',boxShadow:D.shadow,border:`1px solid ${D.border}`}}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'16px 20px',borderBottom:`2px solid ${D.blueDim}`,
          background:`linear-gradient(135deg,${D.blueDim},${D.goldDim})`,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${D.blue},${D.blueLt})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 14px ${D.blue}40`}}>
              <Receipt size={16} style={{color:'#fff'}}/>
            </div>
            <div>
              <h3 style={{fontSize:14,fontWeight:800,color:D.text,margin:'0 0 1px'}}>{t('dashboard.lastInvoices')}</h3>
              <p style={{fontSize:10,color:D.muted,margin:0}}>{t('dashboard.lastActivity')}</p>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Link to="/quotes/new" style={{
              display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,textDecoration:'none',fontSize:12,fontWeight:800,
              background:`linear-gradient(135deg,${D.blue},${D.blueLt})`,color:'#fff',boxShadow:`0 3px 12px ${D.blue}40`,transition:'all 0.2s'
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.04)';e.currentTarget.style.boxShadow=`0 6px 20px ${D.blue}50`}}
              onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow=`0 3px 12px ${D.blue}40`}}
            >
              <Plus size={13}/> {t('dashboard.newQuoteBtn')}
            </Link>
            <Link to="/invoices" style={{
              display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:10,textDecoration:'none',fontSize:12,fontWeight:700,
              background:D.blueDim,color:D.blue,border:`1px solid ${D.border}`,transition:'all 0.15s'
            }}
              onMouseEnter={e=>e.currentTarget.style.background=D.blueDim2}
              onMouseLeave={e=>e.currentTarget.style.background=D.blueDim}
            >
              {t('dashboard.seeAll')} <ArrowRight size={12}/>
            </Link>
          </div>
        </div>

        {!dashboard?.recentInvoices?.length
          ? <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{width:56,height:56,borderRadius:18,background:D.blueDim,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                <Receipt size={24} style={{color:D.blue}}/>
              </div>
              <p style={{fontWeight:800,color:D.text,fontSize:14,margin:'0 0 4px'}}>{t('dashboard.noInvoices')}</p>
              <p style={{color:D.muted,fontSize:12,margin:'0 0 16px'}}>{t('dashboard.createQuoteToStart')}</p>
              <Link to="/quotes/new" style={{
                display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',
                borderRadius:12,textDecoration:'none',fontSize:12,fontWeight:800,
                background:`linear-gradient(135deg,${D.blue},${D.blueLt})`,color:'#fff',boxShadow:`0 4px 16px ${D.blue}40`
              }}>
                <Plus size={14}/> {t('dashboard.createFirstQuote')}
              </Link>
            </div>
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:D.blueDim}}>
                    {[t('dashboard.number'),t('dashboard.client'),t('common.total'),t('dashboard.status'),t('dashboard.date'),''].map((h,i)=>(
                      <th key={i} style={{
                        padding:'10px 16px',textAlign:i>=2&&i<5?'center':i===5?'right':'left',
                        fontSize:10,fontWeight:800,color:D.blue,textTransform:'uppercase',
                        letterSpacing:'0.07em',borderBottom:`1px solid ${D.border}`,whiteSpace:'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentInvoices.map((inv,idx)=>(
                    <InvoiceRow key={inv.id} inv={inv} idx={idx} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs}/>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* ── TICKER (mesaj ki defile anba) ── */}
      <TickerBanner />

      {/* ── MODAL PEMAN ── */}
      {showPayment && (
        <PaymentModal
          tenant={tenant}
          onClose={() => setShowPayment(false)}
        />
      )}

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>
    </div>
  )
}

function InvoiceRow({ inv, idx, showRate, exchangeRates, visibleCurrs }) {
  const { t } = useTranslation()
  const [hov,setHov] = useState(false)
  const convStr = showRate ? fmtConv(Number(inv.totalHtg||0),exchangeRates,visibleCurrs) : null

  const statusMap = {
    unpaid:    { bg:'rgba(192,57,43,0.08)',  color:'#C0392B', label:t('dashboard.unpaidLabel') },
    partial:   { bg:'rgba(217,119,6,0.10)',  color:'#D97706', label:t('dashboard.partialLabel') },
    paid:      { bg:'rgba(5,150,105,0.08)',  color:'#059669', label:t('dashboard.paidLabel') },
    cancelled: { bg:'rgba(100,100,100,0.08)',color:'#666',    label:t('dashboard.cancelledLabel') },
  }

  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?D.blueDim:idx%2===0?'#fff':'rgba(244,246,255,0.5)',transition:'background 0.15s',borderBottom:`1px solid ${D.border}`,cursor:'pointer'}}>
      <td style={{padding:'12px 16px'}}>
        <span style={{fontFamily:'monospace',fontWeight:800,color:D.blue,fontSize:12}}>{inv.invoiceNumber}</span>
      </td>
      <td style={{padding:'12px 16px',fontSize:13,fontWeight:600,color:D.text}}>
        {inv.client?.name||'—'}
      </td>
      <td style={{padding:'12px 16px',textAlign:'center'}}>
        <div>
          <span style={{fontFamily:'monospace',fontWeight:800,color:D.text,fontSize:13}}>
            {Number(inv.totalHtg||0).toLocaleString('fr-HT',{minimumFractionDigits:2})}
          </span>
          <span style={{color:D.muted,fontSize:10,marginLeft:3}}>HTG</span>
        </div>
        {convStr&&<div style={{fontSize:10,color:D.muted,fontFamily:'monospace',marginTop:2}}>{convStr}</div>}
      </td>
      <td style={{padding:'12px 16px',textAlign:'center'}}>
        {(()=>{
          const s = statusMap[inv.status]||statusMap.unpaid
          return <span style={{fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:99,background:s.bg,color:s.color,letterSpacing:'0.05em',textTransform:'uppercase'}}>{s.label}</span>
        })()}
      </td>
      <td style={{padding:'12px 16px',textAlign:'center',fontSize:11,color:D.muted,fontFamily:'monospace'}}>
        {format(new Date(inv.issueDate),'dd/MM/yy')}
      </td>
      <td style={{padding:'12px 16px',textAlign:'right'}}>
        <Link to={`/invoices/${inv.id}`} style={{
          width:30,height:30,borderRadius:8,display:'inline-flex',alignItems:'center',justifyContent:'center',
          background:hov?`linear-gradient(135deg,${D.blue},${D.blueLt})`:D.blueDim,
          color:hov?'#fff':D.blue,textDecoration:'none',transition:'all 0.2s',
        }}>
          <ArrowRight size={13}/>
        </Link>
      </td>
    </tr>
  )
}