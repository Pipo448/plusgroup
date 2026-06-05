// src/pages/public/PublicQuote.jsx
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Phone, Mail, MapPin, Globe, Lock, FileText, User, MessageCircle,
  Printer, AlertTriangle, CheckCircle2, Award, Truck, Headphones,
  ShieldCheck, Building2, CreditCard, Banknote, Calendar
} from 'lucide-react'

// ════════════════════════════════════════════════════════════
// PALÈT KOULÈ — Konsistan ak brand PLUS GROUP
// ════════════════════════════════════════════════════════════
const D = {
  blue:    '#1B2A8F', blueLt: '#2D3FBF', blueDk: '#0F1A5C', blueDeep: '#0A1240',
  orange:  '#FF6B00', orangeLt: '#FF8C33', orangeDk: '#CC5500',
  gold:    '#C9A84C',
  white:   '#FFFFFF', bg: '#F4F6FF', bgGray: '#F8F9FF', bgLight: '#FAFBFF',
  border:  '#E2E8F0', borderLt: '#EEF0FF',
  text:    '#0F1A5C', muted: '#6B7AAB', textLt: '#475569',
  success: '#059669', red: '#DC2626', warning: '#D97706',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })
const CURRENCY_SYMBOL = { HTG: 'G', USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }
const SESSION_KEY = (token) => `proforma-code-${token}`

function useScreenSize() {
  const [size, setSize] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    return { isMobile: w < 640, isTablet: w >= 640 && w < 1024 }
  })
  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth
      setSize({ isMobile: w < 640, isTablet: w >= 640 && w < 1024 })
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

// ════════════════════════════════════════════════════════════
// COMPONENT PRENSIPAL
// ════════════════════════════════════════════════════════════
export default function PublicQuote() {
  const { token } = useParams()
  const { isMobile, isTablet } = useScreenSize()

  const [stage,   setStage]   = useState('loading')   // loading | pin | proforma | error | notFound
  const [data,    setData]    = useState(null)        // initial metadata (tenant) OR full quote
  const [error,   setError]   = useState(null)
  const [tenant,  setTenant]  = useState(null)        // tenant info ki vini nan premye load
  const [submitting, setSubmitting] = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || 'https://plusgroup-backend.onrender.com/api/v1'

  // ─── Premye load: jwenn enfo tenant (san kòd)
  useEffect(() => {
    // Si gen kòd nan sessionStorage, ale dirèkteman
    const savedCode = sessionStorage.getItem(SESSION_KEY(token))
    if (savedCode) {
      fetchWithCode(savedCode, true)
      return
    }

    fetch(`${API_BASE}/quotes/public/${token}`)
      .then(r => {
        if (r.status === 404) throw new Error('notfound')
        if (!r.ok) throw new Error('Erè koneksyon')
        return r.json()
      })
      .then(res => {
        if (!res.success) throw new Error(res.message || 'Erè')
        if (res.needsCode) {
          setTenant(res.tenant)
          setStage('pin')
        }
      })
      .catch(err => {
        if (err.message === 'notfound') setStage('notFound')
        else { setError(err.message); setStage('error') }
      })
    // eslint-disable-next-line
  }, [token])

  const fetchWithCode = async (code, fromSession = false) => {
    setSubmitting(true)
    try {
      const r = await fetch(`${API_BASE}/quotes/public/${token}?code=${encodeURIComponent(code)}`)
      const res = await r.json()
      if (r.status === 401) {
        // Kòd pa kòrèk
        sessionStorage.removeItem(SESSION_KEY(token))
        if (fromSession) {
          // Si kòd ki te sove a pa valid ankò, retounen nan PIN
          // Premye load tenant info
          const r2 = await fetch(`${API_BASE}/quotes/public/${token}`)
          const meta = await r2.json()
          if (meta.success && meta.needsCode) {
            setTenant(meta.tenant)
            setStage('pin')
            setError('Kòd akse a chanje. Antre nouvo kòd la.')
          } else {
            setStage('notFound')
          }
        } else {
          setError('Kòd la pa kòrèk. Eseye ankò.')
        }
        setSubmitting(false)
        return
      }
      if (r.status === 404) { setStage('notFound'); return }
      if (!r.ok || !res.success) throw new Error(res.message || 'Erè')

      sessionStorage.setItem(SESSION_KEY(token), code)
      setData(res)
      setStage('proforma')
      setError(null)
    } catch (err) {
      setError(err.message)
      setStage('error')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────── ETA YO ───────────
  if (stage === 'loading')  return <LoadingState/>
  if (stage === 'notFound') return <NotFoundState/>
  if (stage === 'error')    return <ErrorState message={error}/>
  if (stage === 'pin') {
    return <PinEntry
      tenant={tenant}
      onSubmit={fetchWithCode}
      error={error}
      submitting={submitting}
      isMobile={isMobile}
    />
  }

  // ─── PROFORMA ───
  const { quote } = data || {}
  if (!quote) return <ErrorState message="Données incomplètes."/>

  return <ProformaView quote={quote} isMobile={isMobile} isTablet={isTablet}/>
}

// ════════════════════════════════════════════════════════════
// PAJ PIN ENTRY
// ════════════════════════════════════════════════════════════

function PinEntry({ tenant, onSubmit, error, submitting, isMobile }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const inputs = useRef([])

  const handleChange = (i, v) => {
    // Aksepte sèlman chif
    const clean = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = clean
    setDigits(next)

    if (clean && i < 3) {
      inputs.current[i + 1]?.focus()
    }

    // Auto-submit lè 4 chif konplè
    if (next.every(d => d.length === 1) && !submitting) {
      onSubmit(next.join(''))
    }
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 3) inputs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      setDigits(pasted.split(''))
      if (!submitting) onSubmit(pasted)
    }
  }

  return (
    <div style={pinPageStyle}>
      <div style={pinCardStyle(isMobile)}>

        {/* Logo / Branding */}
        {tenant?.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant.name} style={{
            height: 80, width: 'auto', objectFit: 'contain',
            margin: '0 auto 18px', display: 'block',
            background: '#fff', padding: 8, borderRadius: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          }}/>
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: 18,
            background: `linear-gradient(135deg, ${D.orange}, ${D.orangeLt})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900, color: '#fff',
            margin: '0 auto 18px',
            boxShadow: `0 8px 24px ${D.orange}50`,
          }}>
            {(tenant?.name || 'P').charAt(0).toUpperCase()}
          </div>
        )}

        <h1 style={{ fontSize: 18, fontWeight: 900, color: D.text, margin: 0, textAlign: 'center' }}>
          {tenant?.name || 'PLUS GROUP'}
        </h1>

        {/* Tit Lock */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          margin: '20px 0 14px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${D.orange}15`, color: D.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={18}/>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: 0 }}>
            Code d'accès requis
          </h2>
        </div>

        <p style={{ fontSize: 13, color: D.muted, textAlign: 'center', margin: '0 0 22px', lineHeight: 1.5 }}>
          Veuillez saisir le code à 4 chiffres qui vous a été envoyé pour accéder à votre proforma.
        </p>

        {/* 4 ti bwat PIN */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              onFocus={e => e.target.select()}
              autoFocus={i === 0}
              disabled={submitting}
              style={{
                width: 56, height: 64,
                fontSize: 28, fontWeight: 900, textAlign: 'center',
                color: D.text,
                border: `2px solid ${error ? D.red : (d ? D.blue : D.borderLt)}`,
                borderRadius: 12,
                background: '#fff',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {/* Mesaj erè */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', background: 'rgba(220,38,38,0.08)',
            border: `1px solid ${D.red}30`, borderRadius: 10,
            marginTop: 6,
          }}>
            <AlertTriangle size={14} color={D.red}/>
            <span style={{ fontSize: 12, color: D.red, fontWeight: 700 }}>{error}</span>
          </div>
        )}

        {/* Chajman */}
        {submitting && (
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: D.muted, fontWeight: 600 }}>
            ⏳ Vérification en cours...
          </div>
        )}

        {/* Ti not anba */}
        <p style={{ fontSize: 11, color: D.muted, textAlign: 'center', margin: '20px 0 0', lineHeight: 1.5 }}>
          🔒 Cet accès est sécurisé pour préserver la confidentialité de votre proforma.
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PWOFORMA KONPLÈ (apre PIN valid)
// ════════════════════════════════════════════════════════════

function ProformaView({ quote, isMobile, isTablet }) {
  const { tenant } = quote
  const currency = quote.currency || 'HTG'
  const symbol   = CURRENCY_SYMBOL[currency] || currency
  const items    = quote.items || []
  const client   = quote.clientSnapshot || quote.client || {}

  const useUsd   = currency === 'USD'
  const total    = useUsd ? quote.totalUsd    : quote.totalHtg
  const subtotal = useUsd ? quote.subtotalUsd : quote.subtotalHtg
  const discount = useUsd ? quote.discountUsd : quote.discountHtg
  const tax      = useUsd ? quote.taxUsd      : quote.taxHtg

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${D.blueDeep} 0%, ${D.blueDk} 100%)`,
      padding: isMobile ? 0 : '40px 20px',
      fontFamily: 'DM Sans, system-ui, sans-serif',
      paddingBottom: isMobile ? 90 : 60,
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        background: D.white,
        borderRadius: isMobile ? 0 : 20,
        overflow: 'hidden',
        boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.3)',
      }}>

        {/* ═══ ANTÈT KONPAYI (banyè imaj OSWA fallback) ═══ */}
        <CompanyBanner tenant={tenant} isMobile={isMobile}/>

        {/* ═══ KONTNI PRENSIPAL ═══ */}
        <div style={{ padding: isMobile ? '20px 16px' : '32px 40px' }}>
          <DocumentTitle quote={quote} isMobile={isMobile}/>
          <DocumentMeta quote={quote} tenant={tenant} currency={currency} isMobile={isMobile} isTablet={isTablet}/>
          <ClientAndNote client={client} notes={quote.notes} isMobile={isMobile}/>
          <ItemsTable items={items} symbol={symbol} useUsd={useUsd} isMobile={isMobile}/>
          <BottomGrid
            quote={quote}
            symbol={symbol}
            subtotal={subtotal}
            discount={discount}
            tax={tax}
            total={total}
            isMobile={isMobile}
          />
          <ServicesBanner isMobile={isMobile}/>
          <ThankYouFooter tenant={tenant} isMobile={isMobile}/>
        </div>
      </div>

      {/* Bar aksyon mobile */}
      <MobileActionBar tenant={tenant} quote={quote} isMobile={isMobile}/>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ANTÈT BANYÈ — itilize tenant.bannerUrl si li egziste
// ════════════════════════════════════════════════════════════

function CompanyBanner({ tenant, isMobile }) {
  const bannerUrl = tenant?.bannerUrl
  const logoUrl   = tenant?.logoUrl
  const name      = tenant?.name || 'PLUS GROUP'
  const tagline   = tenant?.tagline || 'LA QUALITÉ, NOTRE ENGAGEMENT'

  // ✅ SI GEN bannerUrl — itilize imaj la dirèkteman
  if (bannerUrl) {
    return (
      <div style={{ width: '100%', background: D.white }}>
        <img src={bannerUrl} alt={name} style={{
          width: '100%', height: 'auto', display: 'block',
        }}/>
      </div>
    )
  }

  // ✅ SINON — kreye yon antèt vizyèlman atire (fallback)
  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(135deg, ${D.blueDk} 0%, ${D.blue} 60%, ${D.blueLt} 100%)`,
      padding: isMobile ? '24px 18px' : '36px 44px',
      overflow: 'hidden',
    }}>
      {/* Aksan dekoratif oranj */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
        position: 'absolute', top: 0, right: 0, width: '40%', height: '100%',
        opacity: 0.18, pointerEvents: 'none',
      }}>
        <path d="M 60 0 Q 100 30 80 60 Q 60 90 100 100 L 100 0 Z" fill={D.orange}/>
      </svg>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
        position: 'absolute', bottom: -20, left: -20, width: '30%', height: '60%',
        opacity: 0.12, pointerEvents: 'none',
      }}>
        <circle cx="30" cy="70" r="40" fill={D.gold}/>
      </svg>

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 22,
      }}>
        {/* Logo */}
        {logoUrl ? (
          <img src={logoUrl} alt={name} style={{
            height: isMobile ? 64 : 90, width: 'auto', objectFit: 'contain',
            background: '#fff', padding: 8, borderRadius: 14,
            flexShrink: 0,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}/>
        ) : (
          <div style={{
            width: isMobile ? 72 : 96, height: isMobile ? 72 : 96,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${D.orange}, ${D.orangeLt})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? 28 : 38, fontWeight: 900, color: '#fff',
            flexShrink: 0,
            boxShadow: `0 8px 24px ${D.orange}60`,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? 24 : 38, fontWeight: 900,
            color: '#fff', margin: 0, letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}>
            {name}
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 8,
          }}>
            <div style={{ width: 30, height: 2, background: D.orange }}/>
            <p style={{
              fontSize: isMobile ? 10 : 12, fontWeight: 800,
              color: D.orange, margin: 0,
              textTransform: 'uppercase', letterSpacing: '0.14em',
            }}>
              {tagline}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SEKSYON YO
// ════════════════════════════════════════════════════════════

function DocumentTitle({ quote, isMobile }) {
  return (
    <div style={{ marginBottom: isMobile ? 18 : 22 }}>
      <h2 style={{
        fontSize: isMobile ? 28 : 40, fontWeight: 900,
        margin: 0, lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        <span style={{ color: D.blue }}>PROFORMA</span>
      </h2>
      <div style={{
        display: 'inline-block',
        marginTop: 12, padding: '6px 16px',
        background: D.blue, color: '#fff',
        borderRadius: 8,
        fontSize: isMobile ? 12 : 14, fontWeight: 800,
        fontFamily: 'monospace', letterSpacing: '0.05em',
      }}>
        N° {quote.quoteNumber}
      </div>
    </div>
  )
}

function DocumentMeta({ quote, tenant, currency, isMobile, isTablet }) {
  const lines = [
    { icon: Calendar, label: 'Date',          value: formatDate(quote.issueDate) },
    { icon: Calendar, label: "Valide jusqu'au", value: quote.expiryDate ? formatDate(quote.expiryDate) : '—' },
    { icon: User,     label: 'Préparé par',   value: tenant?.name || '—' },
    { icon: Banknote, label: 'Devise',        value: `${currency} (${CURRENCY_SYMBOL[currency] || ''})` },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: 8,
      padding: '16px 18px',
      background: D.bgGray,
      borderRadius: 12,
      border: `1px solid ${D.borderLt}`,
      marginBottom: isMobile ? 16 : 22,
    }}>
      {lines.map((line, i) => {
        const Icon = line.icon
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon size={14} color={D.blue} style={{ flexShrink: 0 }}/>
            <span style={{ fontSize: 12, color: D.muted, fontWeight: 600, minWidth: 100 }}>
              {line.label} :
            </span>
            <span style={{ fontSize: isMobile ? 12 : 13, color: D.text, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {line.value || '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ClientAndNote({ client, notes, isMobile }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: 12,
      marginBottom: isMobile ? 18 : 26,
    }}>
      {/* FACTURÉ À */}
      <div style={{
        background: D.white,
        border: `1.5px solid ${D.borderLt}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{
          background: D.blue, color: '#fff',
          padding: '10px 16px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <User size={13}/> FACTURÉ À
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row icon={User}   text={client?.name    || '—'}    color={D.blue}/>
          {client?.phone   && <Row icon={Phone}  text={client.phone}   color={D.success}/>}
          {client?.email   && <Row icon={Mail}   text={client.email}   color={D.orange}/>}
          {client?.address && <Row icon={MapPin} text={client.address} color={D.red}/>}
        </div>
      </div>

      {/* NOTE */}
      <div style={{
        background: D.white,
        border: `1.5px solid ${D.borderLt}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{
          background: D.orange, color: '#fff',
          padding: '5px 14px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          alignSelf: 'flex-start',
          margin: '10px 10px 0',
          borderRadius: 6,
        }}>
          <FileText size={12}/> NOTE
        </div>
        <div style={{ padding: '8px 16px 14px' }}>
          <p style={{ fontSize: 12, color: D.textLt, margin: 0, lineHeight: 1.6 }}>
            {notes || 'Merci pour votre confiance. Pour toute question, veuillez nous contacter.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, text, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: D.textLt }}>
      <Icon size={12} color={color} style={{ flexShrink: 0 }}/>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{text}</span>
    </div>
  )
}

function ItemsTable({ items, symbol, useUsd, isMobile }) {
  // ─── SOU TELEFÒN — kat ─────
  if (isMobile) {
    return (
      <div style={{ marginBottom: 22 }}>
        <div style={{
          background: D.blue, color: '#fff',
          padding: '12px 14px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
          borderRadius: '12px 12px 0 0',
          textAlign: 'center',
        }}>
          📦 PRODUITS / SERVICES ({items.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, background: D.bgGray, borderRadius: '0 0 12px 12px' }}>
          {items.map((item, i) => {
            const lineTotal = useUsd ? item.totalUsd : item.totalHtg
            const unitPrice = useUsd ? item.unitPriceUsd : item.unitPriceHtg
            const name = item.product?.name || item.productSnapshot?.name || '—'
            // ✅ KORIJE — itilize deskripsyon pwodwi a (pa kòd la)
            const desc = item.product?.description || item.notes || ''
            return (
              <div key={i} style={{
                background: D.white,
                borderRadius: 10,
                padding: 12,
                border: `1px solid ${D.borderLt}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: D.blue, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>{name}</p>
                    {desc && (
                      <p style={{ fontSize: 11, color: D.muted, margin: '3px 0 0', lineHeight: 1.4 }}>
                        {desc}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
                  <Cell label="Qté"        value={Number(item.quantity)}/>
                  <Cell label="Prix unit." value={`${fmt(unitPrice)} ${symbol}`}/>
                  <Cell label="Total"      value={`${fmt(lineTotal)} ${symbol}`} highlight/>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── SOU DESKTOP — tablo ─────
  return (
    <div style={{
      marginBottom: 26,
      border: `1.5px solid ${D.borderLt}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: D.blue, color: '#fff' }}>
            <th style={thStyle(50)}>#</th>
            <th style={thStyle(undefined, 'left')}>PRODUIT</th>
            <th style={thStyle(undefined, 'left')}>DESCRIPTION</th>
            <th style={thStyle(60,  'center')}>QTÉ</th>
            <th style={thStyle(120, 'right')}>PRIX UNIT.</th>
            <th style={thStyle(120, 'right')}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const lineTotal = useUsd ? item.totalUsd : item.totalHtg
            const unitPrice = useUsd ? item.unitPriceUsd : item.unitPriceHtg
            const name = item.product?.name || item.productSnapshot?.name || '—'
            // ✅ KORIJE — itilize deskripsyon pwodwi a
            const desc = item.product?.description || item.notes || '—'
            return (
              <tr key={i} style={{
                background: i % 2 === 0 ? D.white : D.bgLight,
                borderBottom: `1px solid ${D.borderLt}`,
              }}>
                <td style={{ padding: '14px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: D.blue, fontSize: 13 }}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td style={{ padding: '14px', fontSize: 13, fontWeight: 700, color: D.text }}>
                  {name}
                </td>
                <td style={{ padding: '14px', fontSize: 12, color: D.textLt, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {desc}
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: D.text }}>
                  {Number(item.quantity)}
                </td>
                <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.text }}>
                  {fmt(unitPrice)}
                </td>
                <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: D.blue, fontSize: 14 }}>
                  {fmt(lineTotal)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ label, value, highlight }) {
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 800, color: highlight ? D.blue : D.text, fontFamily: 'monospace', margin: '2px 0 0' }}>{value}</p>
    </div>
  )
}

function thStyle(width, align = 'center') {
  return {
    padding: '14px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
    textAlign: align,
    ...(width && { width }),
  }
}

function BottomGrid({ quote, symbol, subtotal, discount, tax, total, isMobile }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
      gap: 12,
      marginBottom: isMobile ? 18 : 26,
    }}>
      {/* CONDITIONS */}
      <div style={blockStyle(D.orange)}>
        <BlockHeader icon={Award} title="CONDITIONS DE PAIEMENT" color={D.orange}/>
        <div style={{ padding: '12px 14px' }}>
          <p style={{ fontSize: 11, color: D.textLt, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {quote.terms || 'Paiements acceptés : Espèces, MonCash, NatCash, Sogebank, BUH.'}
          </p>
        </div>
      </div>

      {/* INFORMATIONS BANCAIRES OSWA MODE DE PAIEMENT */}
      <div style={blockStyle(D.blue)}>
        <BlockHeader icon={CreditCard} title="MODE DE PAIEMENT" color={D.blue}/>
        <div style={{ padding: '12px 14px', fontSize: 11, color: D.textLt, lineHeight: 1.5 }}>
          Paiements acceptés : Espèces, MonCash, NatCash, Sogebank, BUH.<br/>
          Contactez l'entreprise pour plus d'informations.
        </div>
      </div>

      {/* TOTAL */}
      <div style={{ ...blockStyle(D.blueDk), background: D.white }}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <TotalRow label="SOUS-TOTAL" value={`${fmt(subtotal)} ${symbol}`}/>
          {Number(discount) > 0 && (
            <TotalRow
              label={`REMISE${quote.discountType === 'percent' ? ` (${quote.discountValue}%)` : ''}`}
              value={`-${fmt(discount)} ${symbol}`}
              color={D.red}
            />
          )}
          {Number(tax) > 0 && <TotalRow label={`TAXE (${quote.taxRate}%)`} value={`+${fmt(tax)} ${symbol}`}/>}

          <div style={{
            marginTop: 8, padding: '14px 16px',
            background: `linear-gradient(135deg, ${D.blueDk}, ${D.blue})`,
            color: '#fff', borderRadius: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.05em' }}>TOTAL À PAYER</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: D.orange }}>
              {fmt(total)} {symbol}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function blockStyle(borderColor) {
  return {
    background: D.white,
    border: `1.5px solid ${D.borderLt}`,
    borderTop: `3px solid ${borderColor}`,
    borderRadius: 12,
    overflow: 'hidden',
  }
}

function BlockHeader({ icon: Icon, title, color }) {
  return (
    <div style={{
      padding: '10px 14px', borderBottom: `1px solid ${D.borderLt}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: `${color}15`, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13}/>
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color: color, letterSpacing: '0.07em' }}>
        {title}
      </span>
    </div>
  )
}

function TotalRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: D.muted, fontWeight: 700 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: color || D.text }}>{value}</span>
    </div>
  )
}

function ServicesBanner({ isMobile }) {
  const services = [
    { icon: Award,       title: 'PRODUITS',       sub: 'DE QUALITÉ',  color: D.gold    },
    { icon: ShieldCheck, title: 'GARANTIE',       sub: 'ASSURÉE',     color: D.success },
    { icon: Truck,       title: 'LIVRAISON',      sub: 'RAPIDE',      color: D.orange  },
    { icon: Headphones,  title: 'SERVICE CLIENT', sub: 'DISPONIBLE',  color: D.blue    },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${D.blueDk}, ${D.blue})`,
      borderRadius: 14, padding: isMobile ? '16px 12px' : '18px 26px',
      marginBottom: 18,
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? 12 : 16,
    }}>
      {services.map((s, i) => {
        const Icon = s.icon
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `${s.color}25`, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={17}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>{s.title}</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0', letterSpacing: '0.05em' }}>{s.sub}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ThankYouFooter({ tenant, isMobile }) {
  return (
    <div style={{ textAlign: 'center', padding: isMobile ? '14px 0' : '18px 0' }}>
      <p style={{
        fontSize: isMobile ? 20 : 24, fontWeight: 800,
        color: D.orange, margin: 0,
        fontStyle: 'italic', fontFamily: 'Georgia, serif',
      }}>
        Merci pour votre confiance !
      </p>
      <p style={{ fontSize: 12, color: D.muted, margin: '6px 0 0', fontWeight: 600 }}>
        {tenant?.name || 'PLUS GROUP'}, toujours là pour vous servir.
      </p>
    </div>
  )
}

function MobileActionBar({ tenant, quote, isMobile }) {
  if (!isMobile) return null
  const phone = tenant?.phone || ''
  const cleanPhone = phone.replace(/\D/g, '')
  const waMessage = encodeURIComponent(
    `Bonjour ${tenant?.name || ''},\n\nJ'ai consulté la proforma N° ${quote.quoteNumber} (Total: ${fmt(quote.totalHtg)} HTG).\n\nJe souhaite discuter avec vous.`
  )
  const waUrl  = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMessage}` : null
  const telUrl = cleanPhone ? `tel:+${cleanPhone}` : null

  return (
    <div className="no-print" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: D.white, borderTop: `1px solid ${D.borderLt}`,
      padding: '10px 12px', display: 'flex', gap: 8,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    }}>
      {waUrl && (
        <a href={waUrl} target="_blank" rel="noreferrer" style={mobileBtnStyle('#25D366')}>
          <MessageCircle size={16}/> WhatsApp
        </a>
      )}
      {telUrl && (
        <a href={telUrl} style={mobileBtnStyle(D.blue)}>
          <Phone size={16}/> Appeler
        </a>
      )}
      <button onClick={() => window.print()} style={{ ...mobileBtnStyle(D.orange), border: 'none' }}>
        <Printer size={16}/> Imprimer
      </button>
    </div>
  )
}

function mobileBtnStyle(color) {
  return {
    flex: 1, padding: '12px 8px',
    background: `linear-gradient(135deg, ${color}, ${color}DD)`,
    color: '#fff', borderRadius: 10, textDecoration: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
  }
}

// ════════════════════════════════════════════════════════════
// ETA YO (Loading / Error / NotFound)
// ════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div style={fullPageBlue}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        border: `4px solid rgba(255,255,255,0.2)`,
        borderTopColor: D.orange,
        animation: 'spin 1s linear infinite',
      }}/>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, margin: '16px 0 0' }}>
        Chargement...
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={fullPageBlue}>
      <div style={fallbackCard}>
        <div style={iconCircle('rgba(220,38,38,0.1)', D.red)}>
          <AlertTriangle size={28}/>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: D.text, margin: '0 0 8px' }}>Erreur</h2>
        <p style={{ fontSize: 13, color: D.muted, margin: 0, lineHeight: 1.5 }}>{message}</p>
      </div>
    </div>
  )
}

function NotFoundState() {
  return (
    <div style={fullPageBlue}>
      <div style={fallbackCard}>
        <div style={iconCircle('rgba(217,119,6,0.1)', D.warning)}>
          <AlertTriangle size={28}/>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: D.text, margin: '0 0 8px' }}>Lien introuvable</h2>
        <p style={{ fontSize: 13, color: D.muted, margin: 0, lineHeight: 1.5 }}>
          Ce lien proforma n'existe pas ou a été révoqué.<br/>
          Veuillez contacter l'entreprise pour un nouveau lien.
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STIL YO
// ════════════════════════════════════════════════════════════

const pinPageStyle = {
  minHeight: '100vh',
  background: `linear-gradient(135deg, ${D.blueDeep}, ${D.blue})`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20, fontFamily: 'DM Sans, sans-serif',
}

const pinCardStyle = (isMobile) => ({
  background: D.white,
  borderRadius: 22,
  padding: isMobile ? '32px 24px' : '40px 36px',
  maxWidth: 420, width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
})

const fullPageBlue = {
  minHeight: '100vh',
  background: `linear-gradient(135deg, ${D.blueDeep}, ${D.blue})`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column', padding: 20, fontFamily: 'DM Sans, sans-serif',
}

const fallbackCard = {
  maxWidth: 440, width: '100%',
  background: D.white, borderRadius: 20,
  padding: '36px 28px', textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
}

const iconCircle = (bg, color) => ({
  width: 72, height: 72, borderRadius: 20,
  background: bg, color: color,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 20px',
})

// ════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════
function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
