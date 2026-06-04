// src/pages/public/PublicQuote.jsx
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Phone, Mail, MapPin, Globe, Clock, Calendar, FileText, User,
  MessageCircle, Printer, AlertTriangle, CheckCircle2, Award,
  Truck, Headphones, ShieldCheck, Receipt, Building2, CreditCard, Banknote
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
  success: '#059669', successBg: 'rgba(5,150,105,0.08)',
  red:     '#DC2626', redBg: 'rgba(220,38,38,0.08)',
  warning: '#D97706', warningBg: 'rgba(217,119,6,0.08)',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const CURRENCY_SYMBOL = { HTG: 'G', USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

// ════════════════════════════════════════════════════════════
// HOOKS
// ════════════════════════════════════════════════════════════
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

function useCountdown(targetDate) {
  const [remaining, setRemaining] = useState(() => {
    if (!targetDate) return 0
    return Math.max(0, new Date(targetDate) - new Date())
  })
  useEffect(() => {
    if (!targetDate) return
    const timer = setInterval(() => {
      const diff = Math.max(0, new Date(targetDate) - new Date())
      setRemaining(diff)
      if (diff <= 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])
  const hours   = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)
  return { hours, minutes, seconds, expired: remaining <= 0, totalMs: remaining }
}

// ════════════════════════════════════════════════════════════
// COMPONENT PRENSIPAL
// ════════════════════════════════════════════════════════════
export default function PublicQuote() {
  const { token } = useParams()
  const { isMobile, isTablet } = useScreenSize()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://plusgroup-backend.onrender.com/api/v1'
    fetch(`${API_BASE}/quotes/public/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('Lyen sa pa egziste oswa li pa valid.')
        return r.json()
      })
      .then(res => {
        if (!res.success) throw new Error(res.message || 'Erè')
        setData(res)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const countdown = useCountdown(data?.expiresAt)

  // ─────────── LOADING STATE ───────────
  if (loading) return <LoadingState/>

  // ─────────── ERROR STATE ───────────
  if (error) return <ErrorState message={error}/>

  // ─────────── EXPIRED STATE ───────────
  if (data?.expired || countdown.expired) {
    return <ExpiredState tenant={data?.tenant}/>
  }

  const { quote } = data
  if (!quote) return <ErrorState message="Done a pa konplè."/>

  const { tenant } = quote
  const currency   = quote.currency || 'HTG'
  const symbol     = CURRENCY_SYMBOL[currency] || currency
  const items      = quote.items || []
  const client     = quote.clientSnapshot || quote.client || {}

  const useUsd     = currency === 'USD'
  const total      = useUsd ? quote.totalUsd    : quote.totalHtg
  const subtotal   = useUsd ? quote.subtotalUsd : quote.subtotalHtg
  const discount   = useUsd ? quote.discountUsd : quote.discountHtg
  const tax        = useUsd ? quote.taxUsd      : quote.taxHtg

  return (
    <div style={{
      minHeight:'100vh',
      background:`linear-gradient(180deg, ${D.blueDeep} 0%, ${D.blueDk} 100%)`,
      padding: isMobile ? '0' : '40px 20px',
      fontFamily:'DM Sans, system-ui, sans-serif',
      paddingBottom: isMobile ? 90 : 60,
    }}>

      {/* ─────────── BANYÈ EKSPIRASYON ─────────── */}
      <ExpiryBanner countdown={countdown} expiresAt={data.expiresAt} isMobile={isMobile}/>

      {/* ─────────── KAT PRENSIPAL (PWOFORMA) ─────────── */}
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        background: D.white,
        borderRadius: isMobile ? 0 : 20,
        overflow: 'hidden',
        boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.3)',
      }}>

        {/* ═══ HEADER BANYÈ KONPAYI ═══ */}
        <CompanyHeader tenant={tenant} isMobile={isMobile}/>

        {/* ═══ BARÈ KONTAK ═══ */}
        <ContactBar tenant={tenant} isMobile={isMobile}/>

        {/* ═══ KONTNI PRENSIPAL ═══ */}
        <div style={{ padding: isMobile ? '20px 16px' : '32px 40px' }}>

          {/* Tit + Nimewo */}
          <DocumentTitle quote={quote} isMobile={isMobile}/>

          {/* Enfo dat / valab / devi */}
          <DocumentMeta quote={quote} currency={currency} isMobile={isMobile} isTablet={isTablet}/>

          {/* Kliyan + Nòt */}
          <ClientAndNote client={client} notes={quote.notes} isMobile={isMobile}/>

          {/* Tab pwodwi yo */}
          <ItemsTable items={items} symbol={symbol} useUsd={useUsd} isMobile={isMobile}/>

          {/* Kondisyon + Info bankè + Total */}
          <BottomGrid
            quote={quote}
            symbol={symbol}
            subtotal={subtotal}
            discount={discount}
            tax={tax}
            total={total}
            isMobile={isMobile}
          />

          {/* Banyè sèvis (4 ikon) */}
          <ServicesBanner isMobile={isMobile}/>

          {/* Mesaj remèsiman */}
          <ThankYouFooter tenant={tenant} isMobile={isMobile}/>
        </div>
      </div>

      {/* ─────────── BAR AKSYON MOBILE (sticky bottom) ─────────── */}
      <MobileActionBar tenant={tenant} quote={quote} isMobile={isMobile}/>

      {/* CSS print + ti animation */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SOUS-COMPONENTS
// ════════════════════════════════════════════════════════════

function ExpiryBanner({ countdown, expiresAt, isMobile }) {
  const expiresDate = expiresAt ? new Date(expiresAt) : null
  const expiresStr  = expiresDate ? expiresDate.toLocaleString('fr-HT', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
  }) : '—'

  const isUrgent = countdown.totalMs < 60 * 60 * 1000 // mwens pase 1 èdtan

  return (
    <div className="no-print" style={{
      maxWidth: 900,
      margin: isMobile ? '0' : '0 auto 16px',
      padding: isMobile ? '12px 16px' : '14px 24px',
      background: isUrgent
        ? `linear-gradient(90deg, ${D.red}, ${D.warning})`
        : `linear-gradient(90deg, ${D.orange}, ${D.orangeLt})`,
      color: D.white,
      borderRadius: isMobile ? 0 : 14,
      display: 'flex', alignItems: 'center', gap: 12,
      flexWrap: 'wrap',
      boxShadow: '0 4px 20px rgba(255,107,0,0.35)',
    }}>
      <div className={isUrgent ? 'pulse-soft' : ''} style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Clock size={18} color="#fff"/>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, margin: 0, opacity: 0.95 }}>
          ⏰ Lyen sa valab pou {countdown.hours}h {String(countdown.minutes).padStart(2,'0')}m {String(countdown.seconds).padStart(2,'0')}s
        </p>
        <p style={{ fontSize: isMobile ? 10 : 11, margin: '2px 0 0', opacity: 0.85 }}>
          Apre {expiresStr}, lyen sa ap ekspire epi li pap disponib ankò.
        </p>
      </div>
    </div>
  )
}

function CompanyHeader({ tenant, isMobile }) {
  const tenantName = tenant?.name || 'PLUS GROUP'
  const tagline    = tenant?.tagline || 'LA QUALITÉ, NOTRE ENGAGEMENT'
  const logoUrl    = tenant?.logoUrl || tenant?.logo

  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(135deg, ${D.blueDk} 0%, ${D.blue} 60%, ${D.blueLt} 100%)`,
      padding: isMobile ? '20px 16px' : '28px 40px',
      overflow: 'hidden',
    }}>
      {/* Aksan dekoratif */}
      <div style={{
        position:'absolute', top:-40, right:-40, width:160, height:160,
        borderRadius:'50%',
        background: `radial-gradient(circle, ${D.orange}30, transparent 70%)`,
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', bottom:-30, left:30, width:120, height:120,
        borderRadius:'50%',
        background: `radial-gradient(circle, ${D.gold}25, transparent 70%)`,
        pointerEvents:'none',
      }}/>

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 18,
      }}>
        {/* Logo (oswa inisyal si pa gen logo) */}
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} style={{
            height: isMobile ? 48 : 64, width: 'auto', objectFit: 'contain',
            background: '#fff', padding: 6, borderRadius: 10,
          }}/>
        ) : (
          <div style={{
            width: isMobile ? 56 : 72, height: isMobile ? 56 : 72,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${D.orange}, ${D.orangeLt})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? 22 : 28, fontWeight: 900,
            color: '#fff',
            boxShadow: `0 4px 20px ${D.orange}50`,
            flexShrink: 0,
          }}>
            {tenantName.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? 22 : 32, fontWeight: 900,
            color: '#fff', margin: 0, letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {tenantName}
          </h1>
          <p style={{
            fontSize: isMobile ? 10 : 12, fontWeight: 700,
            color: D.orange, margin: '4px 0 0',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {tagline}
          </p>
        </div>
      </div>
    </div>
  )
}

function ContactBar({ tenant, isMobile }) {
  // Ti banyè kontak — sèlman montre si pwen kontak yo egziste nan tenant la
  const phone   = tenant?.phone
  const email   = tenant?.email
  const address = tenant?.address
  const website = tenant?.website

  const items = [
    phone   && { icon: Phone,  text: phone,   color: D.success },
    email   && { icon: Mail,   text: email,   color: D.orange  },
    address && { icon: MapPin, text: address, color: D.red     },
    website && { icon: Globe,  text: website, color: D.gold    },
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <div style={{
      background: D.blueDeep,
      padding: isMobile ? '10px 16px' : '12px 40px',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: items.length <= 2 ? 'flex-start' : 'space-between',
      alignItems: 'center',
      gap: isMobile ? 8 : 16,
    }}>
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,0.85)',
            fontSize: isMobile ? 11 : 12, fontWeight: 600,
            minWidth: 0,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: `${item.color}30`, color: item.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={12}/>
            </div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 'auto' : 200 }}>
              {item.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DocumentTitle({ quote, isMobile }) {
  return (
    <div style={{ marginBottom: isMobile ? 16 : 20 }}>
      <h2 style={{
        fontSize: isMobile ? 24 : 36, fontWeight: 900,
        margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em',
      }}>
        <span style={{ color: D.blue }}>PROFORMA</span>{' '}
        <span style={{ color: D.orange }}>INVOICE</span>
      </h2>
      <div style={{
        display: 'inline-block',
        marginTop: 10, padding: '5px 14px',
        background: D.blue, color: '#fff',
        borderRadius: 8,
        fontSize: isMobile ? 12 : 13, fontWeight: 800,
        fontFamily: 'monospace', letterSpacing: '0.05em',
      }}>
        N° {quote.quoteNumber}
      </div>
    </div>
  )
}

function DocumentMeta({ quote, currency, isMobile, isTablet }) {
  const lines = [
    { icon: Calendar, label: 'Date',          value: formatDate(quote.issueDate) },
    { icon: Clock,    label: "Valide jusqu'au", value: formatDate(quote.expiryDate) },
    { icon: User,     label: 'Préparé par',   value: quote.tenant?.name || '—' },
    { icon: Banknote, label: 'Devise',        value: `${currency} (${CURRENCY_SYMBOL[currency] || ''})` },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr',
      gap: 8,
      padding: '14px 16px',
      background: D.bgGray,
      borderRadius: 12,
      border: `1px solid ${D.borderLt}`,
      marginBottom: isMobile ? 16 : 20,
    }}>
      {lines.map((line, i) => {
        const Icon = line.icon
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon size={14} color={D.blue} style={{ flexShrink: 0 }}/>
            <span style={{ fontSize: 12, color: D.muted, fontWeight: 600, minWidth: 90 }}>
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
      marginBottom: isMobile ? 16 : 24,
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
          padding: '8px 14px',
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

      {/* NÒT */}
      <div style={{
        background: D.white,
        border: `1.5px solid ${D.borderLt}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: D.orange, color: '#fff',
          padding: '8px 14px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 6,
          alignSelf: 'flex-start',
          margin: '8px 8px 0',
          borderRadius: 6,
        }}>
          <FileText size={13}/> NOTE
        </div>
        <div style={{ padding: '8px 16px 14px', flex: 1 }}>
          <p style={{ fontSize: 12, color: D.textLt, margin: 0, lineHeight: 1.5 }}>
            {notes || 'Merci beaucoup pour votre intérêt pour nos produits. Veuillez trouver ci-dessous les détails de votre demande. N\'hésitez pas à nous contacter pour toute question.'}
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

  // SOU TELEFÒN — montre kòm kat
  if (isMobile) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{
          background: D.blue, color: '#fff',
          padding: '10px 14px',
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
            return (
              <div key={i} style={{
                background: D.white,
                borderRadius: 10,
                padding: 12,
                border: `1px solid ${D.borderLt}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: D.blue, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>{name}</p>
                    {item.notes && <p style={{ fontSize: 11, color: D.muted, margin: '2px 0 0' }}>{item.notes}</p>}
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

  // SOU DESKTOP — tablo klasik
  return (
    <div style={{
      marginBottom: 24,
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
            <th style={thStyle(110, 'right')}>PRIX UNIT.</th>
            <th style={thStyle(110, 'right')}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const lineTotal = useUsd ? item.totalUsd : item.totalHtg
            const unitPrice = useUsd ? item.unitPriceUsd : item.unitPriceHtg
            const name = item.product?.name || item.productSnapshot?.name || '—'
            return (
              <tr key={i} style={{
                background: i % 2 === 0 ? D.white : D.bgLight,
                borderBottom: `1px solid ${D.borderLt}`,
              }}>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: D.blue, fontSize: 13 }}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: D.text }}>{name}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: D.textLt }}>{item.notes || item.product?.code || '—'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: D.text }}>
                  {Number(item.quantity)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.text }}>
                  {fmt(unitPrice)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: D.blue, fontSize: 14 }}>
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
    padding: '12px 14px',
    fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
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
      marginBottom: isMobile ? 16 : 24,
    }}>
      {/* KONDISYON DE PEMAN */}
      {quote.terms && (
        <div style={blockStyle(D.orange)}>
          <BlockHeader icon={Award} title="CONDITIONS DE PAIEMENT" color={D.orange}/>
          <div style={{ padding: '10px 14px' }}>
            <p style={{ fontSize: 11, color: D.textLt, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {quote.terms}
            </p>
          </div>
        </div>
      )}

      {/* INFO BANKÈ — (Tenant fields opsyonèl) */}
      {quote.tenant && (quote.tenant.bankName || quote.tenant.bankAccount) ? (
        <div style={blockStyle(D.blue)}>
          <BlockHeader icon={Building2} title="INFORMATIONS BANCAIRES" color={D.blue}/>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
            {quote.tenant.bankName    && <BankRow label="Banque"  value={quote.tenant.bankName}/>}
            {quote.tenant.bankHolder  && <BankRow label="Titulaire" value={quote.tenant.bankHolder}/>}
            {quote.tenant.bankAccount && <BankRow label="Compte"  value={quote.tenant.bankAccount}/>}
            {quote.tenant.bankIban    && <BankRow label="IBAN"    value={quote.tenant.bankIban}/>}
            {quote.tenant.bankSwift   && <BankRow label="SWIFT"   value={quote.tenant.bankSwift}/>}
          </div>
        </div>
      ) : (
        <div style={blockStyle(D.blue)}>
          <BlockHeader icon={CreditCard} title="MODE DE PAIEMENT" color={D.blue}/>
          <div style={{ padding: '10px 14px', fontSize: 11, color: D.textLt, lineHeight: 1.5 }}>
            Espèces, MonCash, NatCash, oswa Virman Bankè.<br/>
            Kontakte konpayi a pou plis enfòmasyon.
          </div>
        </div>
      )}

      {/* TOTAL */}
      <div style={{
        ...blockStyle(D.blueDk),
        background: D.white,
      }}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <TotalRow label="SOUS-TOTAL" value={`${fmt(subtotal)} ${symbol}`}/>
          {Number(discount) > 0 && <TotalRow label="REMISE" value={`-${fmt(discount)} ${symbol}`} color={D.red}/>}
          {Number(tax) > 0 && <TotalRow label={`TAXE (${quote.taxRate}%)`} value={`+${fmt(tax)} ${symbol}`}/>}

          <div style={{
            marginTop: 8, padding: '12px 14px',
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
      padding: '10px 14px',
      borderBottom: `1px solid ${D.borderLt}`,
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

function BankRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ fontWeight: 700, color: D.muted, minWidth: 72 }}>{label}</span>
      <span style={{ color: D.text }}>: {value}</span>
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
    { icon: Award,       title: 'PRODUITS',         sub: 'DE QUALITÉ',     color: D.gold    },
    { icon: ShieldCheck, title: 'GARANTIE',         sub: 'ASSURÉE',         color: D.success },
    { icon: Truck,       title: 'LIVRAISON',        sub: 'RAPIDE',          color: D.orange  },
    { icon: Headphones,  title: 'SERVICE CLIENT',   sub: 'DISPONIBLE',      color: D.blue    },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${D.blueDk}, ${D.blue})`,
      borderRadius: 14,
      padding: isMobile ? '14px 12px' : '16px 24px',
      marginBottom: 16,
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? 10 : 16,
    }}>
      {services.map((s, i) => {
        const Icon = s.icon
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${s.color}25`, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={16}/>
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
    <div style={{ textAlign: 'center', padding: isMobile ? '12px 0' : '16px 0' }}>
      <p style={{
        fontSize: isMobile ? 18 : 22, fontWeight: 800,
        color: D.orange, margin: 0,
        fontStyle: 'italic',
        fontFamily: 'Georgia, serif',
      }}>
        Merci pour votre confiance !
      </p>
      <p style={{
        fontSize: 12, color: D.muted, margin: '4px 0 0', fontWeight: 600,
      }}>
        {tenant?.name || 'PLUS GROUP'}, toujours là pour vous servir.
      </p>
    </div>
  )
}

function MobileActionBar({ tenant, quote, isMobile }) {
  if (!isMobile) return null

  const phone = tenant?.phone || ''
  const cleanPhone = phone.replace(/\D/g, '')

  // Mesaj prè pou WhatsApp
  const waMessage = encodeURIComponent(
    `Bonjou ${tenant?.name || ''},\n\nMwen wè pwoforma N° ${quote.quoteNumber} (Total: ${fmt(quote.totalHtg)} HTG).\n\nMwen vle pale ak ou sou li.`
  )
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMessage}` : null
  const telUrl = cleanPhone ? `tel:+${cleanPhone}` : null

  return (
    <div className="no-print" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: D.white,
      borderTop: `1px solid ${D.borderLt}`,
      padding: '10px 12px',
      display: 'flex', gap: 8,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    }}>
      {waUrl && (
        <a href={waUrl} target="_blank" rel="noreferrer"
          style={{
            flex: 1, padding: '12px 8px',
            background: '#25D366', color: '#fff',
            borderRadius: 10, textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 13, fontWeight: 800,
            boxShadow: '0 2px 10px rgba(37,211,102,0.35)',
          }}>
          <MessageCircle size={16}/> WhatsApp
        </a>
      )}
      {telUrl && (
        <a href={telUrl}
          style={{
            flex: 1, padding: '12px 8px',
            background: `linear-gradient(135deg, ${D.blue}, ${D.blueLt})`,
            color: '#fff',
            borderRadius: 10, textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 13, fontWeight: 800,
            boxShadow: `0 2px 10px ${D.blue}40`,
          }}>
          <Phone size={16}/> Rele
        </a>
      )}
      <button onClick={() => window.print()}
        style={{
          flex: 1, padding: '12px 8px',
          background: `linear-gradient(135deg, ${D.orange}, ${D.orangeLt})`,
          color: '#fff',
          border: 'none', borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 13, fontWeight: 800,
          boxShadow: `0 2px 10px ${D.orange}40`,
        }}>
        <Printer size={16}/> Print
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STATES (Loading / Error / Expired)
// ════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${D.blueDeep}, ${D.blue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        border: `4px solid rgba(255,255,255,0.2)`,
        borderTopColor: D.orange,
        animation: 'spin 1s linear infinite',
      }}/>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, margin: 0 }}>
        Chajman pwoforma a...
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${D.blueDeep}, ${D.blue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        maxWidth: 400, background: D.white, borderRadius: 20,
        padding: '32px 24px', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: D.redBg, color: D.red,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <AlertTriangle size={28}/>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: D.text, margin: '0 0 8px' }}>
          Yon pwoblèm rive
        </h2>
        <p style={{ fontSize: 13, color: D.muted, margin: 0, lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
    </div>
  )
}

function ExpiredState({ tenant }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${D.blueDeep}, ${D.blue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        maxWidth: 440, background: D.white, borderRadius: 20,
        padding: '36px 28px', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: D.warningBg, color: D.warning,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Clock size={32}/>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: D.text, margin: '0 0 10px' }}>
          Lyen sa ekspire
        </h2>
        <p style={{ fontSize: 14, color: D.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
          Pwoforma sa pa disponib ankò.<br/>
          Tanpri kontakte <strong style={{ color: D.blue }}>{tenant?.name || 'konpayi a'}</strong> pou yon nouvo lyen.
        </p>
        <div style={{
          padding: '12px 16px',
          background: D.bgGray,
          borderRadius: 10,
          fontSize: 12, color: D.textLt,
          fontWeight: 600,
        }}>
          ℹ️ Lyen pwoforma yo valab pou 24 èdtan apre yo kreye.
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════
function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-HT', { day: '2-digit', month: 'long', year: 'numeric' })
}
