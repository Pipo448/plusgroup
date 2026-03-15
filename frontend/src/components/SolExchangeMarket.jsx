// src/components/SolExchangeMarket.jsx
// ✅ Mache Men Sol — Echanj Pozisyon
// Ajoute yon tab "🔄 Mache" nan SolDashboardPage

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

const D = {
  bg: '#060f1e', card: '#0d1b2a', border: 'rgba(201,168,76,0.18)',
  borderSub: 'rgba(255,255,255,0.07)', gold: '#C9A84C',
  goldBtn: 'linear-gradient(135deg,#C9A84C,#8B6914)', goldDim: 'rgba(201,168,76,0.10)',
  green: '#27ae60', greenBg: 'rgba(39,174,96,0.12)',
  red: '#e74c3c', redBg: 'rgba(231,76,60,0.10)',
  orange: '#f39c12', orangeBg: 'rgba(243,156,18,0.10)',
  blue: '#3B82F6', blueBg: 'rgba(59,130,246,0.10)',
  text: '#e8eaf0', muted: '#6b7a99',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })

// ─── Modal konfirmasyon echanj ────────────────────────────────
function ModalConfirmExchange({ offer, myPos, onConfirm, onClose, loading }) {
  const isBuying  = offer.offerType === 'buy'   // initiator vle monte — mwen desann
  const myNewPos  = offer.initiatorPos           // mwen pran plas initiator la
  const hisNewPos = myPos                        // li pran plas mwen

  const fee = offer.feePreview
  const willRise = myNewPos < myPos

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, padding: '24px 18px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 16px', textAlign: 'center' }}>🔄 Konfime Echanj Pozisyon</h3>

        {/* Rezime echanj */}
        <div style={{ background: willRise ? D.greenBg : D.orangeBg, border: `1px solid ${willRise ? D.green : D.orange}30`, borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>Ou KOUNYE A</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: D.text }}>#{myPos}</div>
            </div>
            <div style={{ fontSize: 20, color: willRise ? D.green : D.orange }}>
              {willRise ? '⬆️' : '⬇️'}
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>Ou AP YE</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: willRise ? D.green : D.orange }}>#{myNewPos}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: D.muted, textAlign: 'center' }}>
            Ak: <strong style={{ color: D.text }}>{offer.initiatorName}</strong> (Men #{offer.initiatorPos})
          </div>
        </div>

        {/* Frè */}
        {fee && fee.feeAmount > 0 && (
          <div style={{ background: D.redBg, border: `1px solid ${D.red}25`, borderRadius: 10, padding: '11px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: D.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Frè Echanj (Ou Peye)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: D.muted }}>Diferans pozisyon ({fee.positionDiff} plas):</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: D.muted }}>→ Pati moun ki desann nan:</span>
              <span style={{ fontWeight: 700, color: D.gold }}>{fmt(fee.feeSellerAmt)} HTG</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: D.muted }}>→ Pati admin:</span>
              <span style={{ fontWeight: 700, color: D.muted }}>{fmt(fee.feeAdminAmt)} HTG</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: `1px solid ${D.red}20`, paddingTop: 7, marginTop: 4 }}>
              <span style={{ color: D.red, fontWeight: 800 }}>TOTAL FRÈ:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, color: D.red }}>{fmt(fee.feeAmount)} HTG</span>
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: D.muted, textAlign: 'center', margin: '0 0 14px' }}>
          ⚠️ Echanj sa <strong style={{ color: D.text }}>pa ka defèt</strong> apre konfirmasyon.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {loading ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : '🔄'}
            {loading ? 'Ap trete...' : 'Konfime Echanj'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal kreye ofri ─────────────────────────────────────────
function ModalCreateOffer({ myPos, plan, token, planId, onClose, onCreated }) {
  const [offerType, setOfferType] = useState('buy')
  const [targetPos, setTargetPos] = useState('')
  const [notes,     setNotes]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [allMembers, setAllMembers] = useState([])

  useEffect(() => {
    // Chaje lis manm plan an pou chwazi yon target
    fetch(`${SOL_API}/api/sol/exchange/${planId}/offers`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/exchange/${planId}/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ offerType, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erè')
      toast.success('✅ Ofri pibliye! Tout manm yo avize.')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const typeConfigs = {
    buy: {
      label: '⬆️ Mwen Vle MONTE',
      desc: `Ou nan Men #${myPos}. Ou vle echanje ak yon moun ki gen yon men DEVAN ou (piti nimewo). Ou ap touche pi rapid men ou ap peye frè.`,
      color: D.green,
    },
    sell: {
      label: '⬇️ Mwen Vle DESANN',
      desc: `Ou nan Men #${myPos}. Ou vle desann pou bay yon moun ki vle monte. Ou ap resevwa yon pati frè a.`,
      color: D.orange,
    },
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, padding: '24px 18px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>📢 Pibliye Ofri Echanj</h3>

        <div style={{ background: D.goldDim, borderRadius: 10, padding: '10px 13px', marginBottom: 14, fontSize: 12, color: D.muted }}>
          Pozisyon Aktyèl Ou: <strong style={{ color: D.gold, fontFamily: 'monospace', fontSize: 16 }}>Men #{myPos}</strong>
        </div>

        {/* Chwazi tip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {Object.entries(typeConfigs).map(([type, cfg]) => (
            <button key={type} onClick={() => setOfferType(type)} style={{ flex: 1, padding: '11px 8px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12, border: `2px solid ${offerType === type ? cfg.color : D.borderSub}`, background: offerType === type ? `${cfg.color}15` : 'transparent', color: offerType === type ? cfg.color : D.muted, transition: 'all 0.15s' }}>
              {cfg.label}
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 13px', marginBottom: 14, fontSize: 11, color: D.muted, lineHeight: 1.7 }}>
          {typeConfigs[offerType].desc}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(201,168,76,0.75)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Nòt (Opsyonèl)
          </label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Mwen bezwen kòb rapid..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none', color: D.text, background: D.bg, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {loading ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : '📢'}
            {loading ? 'Ap pibliye...' : 'Pibliye Ofri'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function SolExchangeMarket({ token, member, plan, planId }) {
  const [offers,        setOffers]        = useState([])
  const [myExchanges,   setMyExchanges]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [confirmOffer,  setConfirmOffer]  = useState(null)
  const [showCreate,    setShowCreate]    = useState(false)
  const [accepting,     setAccepting]     = useState(false)
  const [activeTab,     setActiveTab]     = useState('market')

  const myPos = member.position

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [offersRes, myRes] = await Promise.all([
        fetch(`${SOL_API}/api/sol/exchange/${planId}/offers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${SOL_API}/api/sol/exchange/${planId}/my`,    { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [offersData, myData] = await Promise.all([offersRes.json(), myRes.json()])
      setOffers(offersData.offers || [])
      setMyExchanges(myData.exchanges || [])
    } catch {
      toast.error('Pa ka chaje mache a.')
    } finally {
      setLoading(false)
    }
  }, [token, planId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAccept = async () => {
    if (!confirmOffer) return
    setAccepting(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/exchange/${confirmOffer.id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erè')
      toast.success(`✅ Echanj aksepte! Ou pase Men #${myPos} → Men #${confirmOffer.initiatorPos}`)
      setConfirmOffer(null)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async (exchangeId) => {
    try {
      const res = await fetch(`${SOL_API}/api/sol/exchange/${exchangeId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erè')
      toast('Ofri refize.', { icon: '❌' })
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const statusColors = {
    pending:   { color: D.orange, bg: D.orangeBg, label: '⏳ K ap tann' },
    accepted:  { color: D.green,  bg: D.greenBg,  label: '✅ Aksepte' },
    rejected:  { color: D.red,    bg: D.redBg,    label: '❌ Refize' },
    cancelled: { color: D.muted,  bg: 'rgba(255,255,255,0.04)', label: '🚫 Anile' },
    expired:   { color: D.muted,  bg: 'rgba(255,255,255,0.04)', label: '⌛ Ekspire' },
  }

  // Ofri piblik ki pa pa mwen
  const marketOffers = offers.filter(o => o.initiatorId !== member.id)

  // Pending ofri ki dirèkteman pou mwen
  const myPendingOffers = offers.filter(o => o.targetId === member.id && o.status === 'pending')

  return (
    <div>
      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['market', `🏪 Mache (${marketOffers.length})`], ['my', `📋 Istwa Mwen (${myExchanges.length})`]].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: '9px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: `1px solid ${activeTab === t ? D.gold : D.borderSub}`, background: activeTab === t ? D.goldDim : 'transparent', color: activeTab === t ? D.gold : D.muted, fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Notif — ofri pou mwen dirèkt */}
      {myPendingOffers.length > 0 && (
        <div style={{ background: D.orangeBg, border: `1px solid ${D.orange}40`, borderRadius: 12, padding: '10px 13px', marginBottom: 12, fontSize: 11 }}>
          <p style={{ color: D.orange, fontWeight: 700, margin: '0 0 6px' }}>📨 {myPendingOffers.length} ofri dirèk pou ou:</p>
          {myPendingOffers.map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ color: D.text }}>{o.initiatorName} vle echanje Men #{o.initiatorPos} ak Men #{myPos}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmOffer(o)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: D.green, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Aksepte</button>
                <button onClick={() => handleReject(o.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: D.redBg, color: D.red, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Non</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'market' && (
        <>
          {/* Bouton kreye ofri */}
          <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${D.gold}40`, background: D.goldDim, color: D.gold, cursor: 'pointer', fontWeight: 800, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}>
            📢 Pibliye Ofri Echanj Mwen
          </button>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: D.muted, fontSize: 12 }}>Ap chaje mache a...</div>
          ) : marketOffers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: D.muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏪</div>
              <p style={{ margin: 0, fontSize: 12 }}>Pa gen ofri disponib kounye a.</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.7 }}>Ou ka pibliye pa ou an.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {marketOffers.map(offer => {
                const isBuy    = offer.offerType === 'buy'
                const willRise = offer.feePreview?.viewerCurrentPos > offer.initiatorPos
                const typeColor = isBuy ? D.green : D.orange

                return (
                  <div key={offer.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '13px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: D.text }}>{offer.initiatorName}</span>
                          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700, background: `${typeColor}15`, color: typeColor }}>
                            {isBuy ? '⬆️ Vle Monte' : '⬇️ Vle Desann'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: D.muted }}>
                          Men Aktyèl: <strong style={{ color: D.gold, fontFamily: 'monospace' }}>#{offer.initiatorPos}</strong>
                          {offer.feePreview && <span style={{ marginLeft: 8 }}>→ Ou ap al: <strong style={{ color: D.blue, fontFamily: 'monospace' }}>#{offer.initiatorPos}</strong></span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 9, color: D.muted }}>Frè pou Ou</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: D.red }}>
                          {offer.feePreview ? `${fmt(offer.feePreview.feeAmount)} HTG` : '—'}
                        </div>
                      </div>
                    </div>

                    {offer.notes && (
                      <p style={{ fontSize: 11, color: D.muted, margin: '0 0 10px', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px' }}>
                        💬 "{offer.notes}"
                      </p>
                    )}

                    {offer.feePreview ? (
                      <button onClick={() => setConfirmOffer(offer)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🔄 Aksepte — Echanje Men #{myPos} ak Men #{offer.initiatorPos}
                      </button>
                    ) : (
                      <div style={{ fontSize: 11, color: D.muted, textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        Menm pozisyon oswa pa ka echanje
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'my' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myExchanges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: D.muted }}>
              <p style={{ margin: 0, fontSize: 12 }}>Pa gen echanj pou kounye a.</p>
            </div>
          ) : myExchanges.map(ex => {
            const cfg = statusColors[ex.status] || statusColors.pending
            const isInitiator = ex.initiatorId === member.id
            return (
              <div key={ex.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>
                    {isInitiator ? `📤 Ou inisye → Men #${ex.targetPos || '?'}` : `📥 Men #${ex.initiatorPos} → Ou`}
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </div>
                {ex.feeAmount > 0 && (
                  <div style={{ fontSize: 11, color: D.muted }}>
                    Frè: <strong style={{ color: D.red }}>{fmt(ex.feeAmount)} HTG</strong>
                    {' '}(Vendè: {fmt(ex.feeSellerAmt)} • Admin: {fmt(ex.feeAdminAmt)})
                  </div>
                )}
                {ex.status === 'pending' && isInitiator && (
                  <button onClick={() => handleReject(ex.id)} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: D.redBg, color: D.red, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    🚫 Anile Ofri
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODALS */}
      {confirmOffer && (
        <ModalConfirmExchange
          offer={confirmOffer}
          myPos={myPos}
          loading={accepting}
          onConfirm={handleAccept}
          onClose={() => setConfirmOffer(null)}
        />
      )}

      {showCreate && (
        <ModalCreateOffer
          myPos={myPos}
          plan={plan}
          token={token}
          planId={planId}
          onClose={() => setShowCreate(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  )
}
