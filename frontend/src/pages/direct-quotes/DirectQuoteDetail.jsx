// src/pages/direct-quotes/DirectQuoteDetail.jsx — Plus Fit redesign
// ✅ NOUVO: nòt/kondisyon/dat validite vizib, foto an gwo (lightbox), "Dipliké",
//           WhatsApp dirèk sou nimewo kliyan an, kòd PIN an bwat
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, FileCheck, Share2, Copy, Check, MessageCircle, Lock, RefreshCw, Trash2, X, Printer,
  User, Phone, ShieldCheck, Clock, FileSignature, Package, Calendar, StickyNote, DollarSign, Layers,
} from 'lucide-react'
import { format } from 'date-fns'
import { printDirectQuoteNative, isNativePrinterAvailable } from '../../services/printerNative'
import '../invoices/invoices.css'

const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n) => Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 0 })
const tr = (t, key, fallback, opts) => { const v = t(key, opts); return v && v !== key ? v : fallback }
const toHaitiDate = (d, f) => {
  try { return format(new Date(new Date(d).toLocaleString('en-US', { timeZone: 'America/Port-au-Prince' })), f) } catch { return '' }
}

const STATUS = {
  draft:     { label: 'Bouyon',  color: '#CBD5E1' },
  sent:      { label: 'Voye',    color: '#93C5FD' },
  accepted:  { label: 'Aksepte', color: '#34D399' },
  converted: { label: 'Konvèti', color: '#C4B5FD' },
  cancelled: { label: 'Anile',   color: '#F87171' },
}
const NO_CLIENT = ['directQuotes.noClient', 'San kliyan', 'Sans client', 'No client']

function useCountUp(value, ms = 800) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, unit = 'HTG', dec = 0 }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{dec ? fmt(v) : fmt0(v)}{unit && <small>{unit}</small>}</div>
    </div>
  )
}

export default function DirectQuoteDetail() {
  const { t }    = useTranslation()
  const { id }   = useParams()
  const navigate = useNavigate()
  const { tenant, user } = useAuthStore()
  const qc       = useQueryClient()

  const [shareOpen, setShareOpen]         = useState(false)
  const [printing, setPrinting]           = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [zoom, setZoom]                   = useState(null)   // foto an gwo

  const { data: dq, isLoading } = useQuery({
    queryKey: ['direct-quote', id],
    queryFn:  () => api.get(`/direct-quotes/${id}`).then(r => r.data.directQuote),
    staleTime: 30_000,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['direct-quote', id] })
    qc.invalidateQueries({ queryKey: ['direct-quotes'] })
  }

  const authorizeMutation = useMutation({
    mutationFn: (pin) => api.post(`/direct-quotes/${id}/authorize`, { pin }),
    onSuccess: () => { toast.success(tr(t, 'directQuotes.authorizedSuccess', 'Devi a otorize!')); setAuthModalOpen(false); refresh() },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'directQuotes.pinIncorrect', 'PIN pa kòrèk.')),
  })

  const convertMutation = useMutation({
    mutationFn: () => api.post(`/direct-quotes/${id}/convert`),
    onSuccess:  (res) => {
      toast.success(tr(t, 'directQuotes.convertedSuccess', 'Devi a konvèti an fakti!'))
      refresh()
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/app/invoices/${res.data.invoice.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'directQuotes.errorConverting', 'Erè pandan konvèsyon an.')),
  })

  // ✅ KORIJE — invalidateQueries({ queryKey }) (v5) + mesaj erè + konfimasyon
  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/direct-quotes/${id}/cancel`),
    onSuccess:  () => { toast.success(tr(t, 'directQuotes.cancelledSuccess', 'Devi a anile.')); refresh() },
    onError:    (e) => toast.error(e.response?.data?.message || 'Erè pandan anilasyon an.'),
  })

  const shareMutation = useMutation({
    mutationFn: () => api.post(`/direct-quotes/${id}/share`),
    onSuccess:  () => { toast.success(tr(t, 'directQuotes.linkCreated', 'Lyen kreye!')); qc.invalidateQueries({ queryKey: ['direct-quote', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || tr(t, 'directQuotes.errorCreatingLink', 'Erè pandan kreye lyen an.')),
  })

  const revokeMutation = useMutation({
    mutationFn: () => api.delete(`/direct-quotes/${id}/share`),
    onSuccess:  () => { toast.success(tr(t, 'directQuotes.linkRevoked', 'Lyen revoke.')); qc.invalidateQueries({ queryKey: ['direct-quote', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || tr(t, 'directQuotes.errorRevokingLink', 'Erè pandan revoke lyen an.')),
  })

  if (isLoading) return (
    <div className="iv">
      <div className="iv-hero" style={{ minHeight: 190 }}>
        <div className="iv-sk" style={{ width: '30%', height: 14, opacity: .25 }}/>
        <div className="iv-sk" style={{ width: '45%', height: 34, marginTop: 12, opacity: .25 }}/>
      </div>
    </div>
  )
  if (!dq) return null

  const snap       = dq.clientSnapshot || {}
  const rawName    = dq.client?.name || snap.name || ''
  const clientName = NO_CLIENT.includes(rawName) ? '' : rawName
  const phone      = snap.phone || dq.client?.phone || ''
  const isAdmin    = user?.role === 'admin' || user?.isAdmin === true
  const isPending  = !dq.authorizedBy && !dq.authorizer && dq.status !== 'cancelled'
  const locked     = isPending && !isAdmin          // kesye: pa enprime/pataje/konvèti anvan otorizasyon
  const canShare   = dq.status !== 'cancelled' && !locked
  const canConvert = !locked && ['draft', 'sent', 'accepted'].includes(dq.status)
  const canCancel  = dq.status === 'draft' || (isAdmin && ['sent', 'accepted'].includes(dq.status))
  const st         = isPending ? { label: 'An atant', color: '#FBBF24' } : (STATUS[dq.status] || STATUS.draft)
  const rate       = Number(tenant?.exchangeRates?.USD || dq.exchangeRate || 132)
  const isExpired  = dq.expiryDate && new Date(dq.expiryDate) < new Date() && !['converted', 'cancelled'].includes(dq.status)
  const daysLeft   = dq.expiryDate ? Math.ceil((new Date(dq.expiryDate) - new Date()) / 864e5) : null

  const handlePrint = async () => {
    if (isNativePrinterAvailable()) {
      setPrinting(true)
      try {
        await printDirectQuoteNative(dq, tenant)
        toast.success(tr(t, 'directQuotes.printedSuccess', 'Devi enprime!'))
      } catch (e) {
        toast.error(e.message || tr(t, 'directQuotes.errorPrinting', 'Erè pandan enpresyon.'))
      } finally {
        setPrinting(false)
      }
    } else {
      window.print()
    }
  }

  const doConvert = () => { if (confirm('Konvèti devi dirèk sa an fakti?')) convertMutation.mutate() }
  const doCancel  = () => { if (confirm('Anile devi sa? Ou pa ka defèt sa.')) cancelMutation.mutate() }

  // ✅ NOUVO — Dipliké: louvri fòm nan deja ranpli ak menm atik yo (foto ladan l)
  const doDuplicate = () => navigate('/app/direct-quotes/new', {
    state: {
      duplicate: {
        client: clientName ? (dq.client || { name: clientName, phone }) : null,
        notes: dq.notes || '', terms: dq.terms || '',
        discountValue: Number(dq.discountHtg || 0),
        items: (dq.items || []).map(it => ({
          description: it.description || '', imageUrl: it.imageUrl || null, size: it.size || '',
          quantity: Number(it.quantity), unitPriceHtg: Number(it.unitPriceHtg), discountAmt: Number(it.discountAmt || 0),
        })),
      },
    },
  })

  return (
    <div className="iv" style={{ maxWidth: 1240, paddingBottom: 80 }}>

      {/* ══════════ HERO ══════════ */}
      <section className="iv-hero">
        <div className="glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,.5), transparent 65%)' }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#A78BFA" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button className="back" onClick={() => navigate('/app/direct-quotes')} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico violet"><FileSignature size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tr(t, 'directQuotes.subtitleDetail', 'Devi dirèk')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1>{dq.quoteNumber}</h1>
              <span className="stamp" style={{ '--sc': st.color }}><i/> {isPending ? st.label : tr(t, `directQuotes.status.${dq.status}`, st.label)}</span>
            </div>
            <div className="meta-line">
              <span><User size={12}/> {clientName || 'San kliyan'}</span>
              <span><Calendar size={12}/> {toHaitiDate(dq.createdAt, 'dd/MM/yyyy')}</span>
              {dq.creator?.fullName && <span>Pa {dq.creator.fullName}</span>}
            </div>
          </div>
          {isPending && isAdmin && (
            <button onClick={() => setAuthModalOpen(true)} className="iv-btn-main pulse no-print" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', boxShadow: '0 10px 24px rgba(124,58,237,.45)' }}>
              <ShieldCheck size={17}/> {tr(t, 'directQuotes.authorize', 'Otorize')}
            </button>
          )}
          {!isPending && canConvert && (
            <button onClick={doConvert} disabled={convertMutation.isPending} className="iv-btn-main pulse no-print">
              {convertMutation.isPending ? <RefreshCw size={17} className="spin"/> : <FileCheck size={17}/>} Konvèti an fakti
            </button>
          )}
        </div>
        <div className="iv-kpis">
          <Kpi label="Total" value={dq.totalHtg} icon={DollarSign} delay={80} tone="gold"/>
          <Kpi label="≈ USD" value={Number(dq.totalHtg || 0) / rate} icon={DollarSign} delay={160} unit="USD" dec={2}/>
          {daysLeft != null && !['converted', 'cancelled'].includes(dq.status)
            ? <Kpi label={isExpired ? 'Ekspire depi' : 'Jou ki rete'} value={Math.abs(daysLeft)} icon={Clock} delay={240} unit="jou" tone={isExpired || daysLeft <= 3 ? 'red' : 'green'}/>
            : <Kpi label="Atik" value={dq.items?.length || 0} icon={Layers} delay={240} unit=""/>}
        </div>
      </section>

      {/* ══════════ ESTATI OTORIZASYON ══════════ */}
      {isPending && (
        <div className="iv-banner pend">
          <span className="ic"><Clock size={17} color="#D97706"/></span>
          <div className="grow">
            <div style={{ fontSize: 13, fontWeight: 800 }}>{isAdmin ? 'Devi sa a ap tann otorizasyon ou' : 'An atant otorizasyon admin'}</div>
            <div style={{ fontWeight: 600 }}>{isAdmin
              ? tr(t, 'directQuotes.pendingBannerAdmin', 'Verifye atik yo ak pri yo, epi klike « Otorize » ak PIN ou.')
              : tr(t, 'directQuotes.pendingBannerCashier', 'Ou p ap ka enprime, pataje oswa konvèti l toutotan yon admin pa otorize l.')}</div>
          </div>
          {isAdmin && <button onClick={() => setAuthModalOpen(true)} style={{ background: '#7C3AED' }}><ShieldCheck size={13}/> Otorize</button>}
        </div>
      )}
      {dq.authorizer && (
        <div className="iv-banner auth">
          <span className="ic"><ShieldCheck size={17} color="#7C3AED"/></span>
          <div className="grow">
            {tr(t, 'directQuotes.authorizedByOn', `Otorize pa ${dq.authorizer.fullName} · ${toHaitiDate(dq.authorizedAt, 'dd/MM/yyyy HH:mm')}`,
              { name: dq.authorizer.fullName, date: toHaitiDate(dq.authorizedAt, 'dd/MM/yyyy HH:mm') })}
          </div>
        </div>
      )}

      {/* ══════════ AKSYON ══════════ */}
      <div className="iv-actions a-up no-print" style={{ animationDelay: '100ms' }}>
        {!locked && (
          <button onClick={handlePrint} disabled={printing} className={isNativePrinterAvailable() ? 'iv-act sky' : 'iv-act'}>
            {printing ? <RefreshCw size={15} className="spin"/> : <Printer size={15}/>} {printing ? 'Ap enprime...' : tr(t, 'directQuotes.print', 'Enprime')}
          </button>
        )}
        {canShare && (
          <button onClick={() => setShareOpen(true)} className={`iv-act ${dq.publicToken ? 'green' : ''}`}>
            <Share2 size={15}/> {dq.publicToken ? 'Lyen aktif' : tr(t, 'directQuotes.share', 'Pataje')}
          </button>
        )}
        <button onClick={doDuplicate} className="iv-act"><Copy size={15}/> Dipliké</button>
        {locked && <span className="iv-mode" style={{ background: 'rgba(217,119,6,.1)', borderColor: 'rgba(217,119,6,.3)', color: '#B45309' }}><Lock size={11}/> Aksyon yo bloke jiskaske admin otorize</span>}
        <span className="sp"/>
        {canCancel && (
          <button onClick={doCancel} disabled={cancelMutation.isPending} className="iv-act danger"><Trash2 size={15}/> {tr(t, 'directQuotes.cancelBtn', 'Anile')}</button>
        )}
      </div>

      <div className="iv-layout">
        <div className="iv-col">
          <section className="iv-sec a-up" style={{ animationDelay: '140ms' }}>
            <div className="iv-sec-h" style={{ marginBottom: phone ? 14 : 0 }}>
              <div className="n"><User size={17}/></div>
              <div><p className="eb">{tr(t, 'directQuotes.clientSection', 'Kliyan')}</p><h3>{clientName || 'San kliyan'}</h3></div>
            </div>
            {phone && <span className="iv-pill muted" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}><Phone size={11}/> {phone}</span>}
          </section>

          <section className="iv-sec a-up" style={{ animationDelay: '200ms' }}>
            <div className="iv-sec-h">
              <div className="n"><Package size={17}/></div>
              <div><p className="eb">Detay</p><h3>Atik yo</h3></div>
              <div className="r"><span className="iv-pill muted">{dq.items?.length || 0} atik</span></div>
            </div>
            <div className="iv-dl-head">
              <span>{tr(t, 'directQuotes.colProductService', 'Pwodwi / sèvis')}</span><span style={{ textAlign: 'center' }}>Qte</span>
              <span style={{ textAlign: 'right' }}>Pri U.</span><span style={{ textAlign: 'right' }}>Rabè</span><span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {(dq.items || []).map((it, i) => {
              const disc = Number(it.discountAmt || 0)
              return (
                <div key={it.id || i} className="iv-dl-row" style={{ animationDelay: `${Math.min(i, 10) * 40 + 220}ms` }}>
                  <div className="nm">
                    {it.imageUrl ? (
                      <button type="button" className="iv-thumb" title="Wè foto a an gwo" onClick={() => setZoom(it)}
                        style={{ width: 52, height: 52, borderRadius: 12, border: 'none', cursor: 'zoom-in', backgroundImage: `url(${it.imageUrl})`, boxShadow: '0 4px 12px rgba(15,26,92,.15)' }}/>
                    ) : (
                      <span className="iv-thumb"><Package size={15} color="#7C3AED"/></span>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <b>{it.description}</b>
                      {it.size && <small style={{ fontFamily: 'Manrope, sans-serif' }}>{tr(t, 'directQuotes.size', 'Gwosè')}: {it.size}</small>}
                    </div>
                  </div>
                  {/* ✅ KORIJE — kantite san ",00" (anvan: 1,00) */}
                  <div className="c"><span className="k">Qte</span><span className="num" style={{ fontSize: 17, fontWeight: 700 }}>{Number(it.quantity)}</span></div>
                  <div className="r"><span className="k">Pri U.</span><span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{fmt(it.unitPriceHtg)}</span></div>
                  <div className={`r ${disc > 0 ? '' : 'disc'}`}><span className="k">Rabè</span><span className="num" style={{ fontSize: 16, color: disc > 0 ? 'var(--bad)' : 'var(--muted)' }}>{disc > 0 ? `−${fmt(disc)}` : '—'}</span></div>
                  <div className="r"><span className="k">Total</span><span className="num" style={{ fontSize: 19, fontWeight: 800 }}>{fmt(it.totalHtg)}</span></div>
                </div>
              )
            })}
          </section>

          {/* ✅ NOUVO — nòt ak kondisyon yo te sove men pa t janm afiche */}
          {(dq.notes || dq.terms) && (
            <section className="iv-sec a-up" style={{ animationDelay: '260ms' }}>
              <div className="iv-sec-h">
                <div className="n"><StickyNote size={17}/></div>
                <div><p className="eb">Pou kliyan an</p><h3>Nòt ak kondisyon</h3></div>
              </div>
              {dq.notes && <div style={{ marginBottom: dq.terms ? 12 : 0 }}><label className="iv-lbl">Nòt</label><p className="iv-note" style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{dq.notes}</p></div>}
              {dq.terms && <div><label className="iv-lbl">Kondisyon</label><p className="iv-note" style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{dq.terms}</p></div>}
            </section>
          )}
        </div>

        <aside className="iv-aside">
          <div className="iv-receipt">
            <div className="rh">
              <span className="brand">{tenant?.businessName || tenant?.name || 'Devi dirèk'}</span>
              {['converted', 'cancelled'].includes(dq.status)
                ? <span className="iv-seal" style={{ '--sc': dq.status === 'converted' ? '#7C3AED' : '#DC2626' }}>{dq.status === 'converted' ? 'KONVÈTI' : 'ANILE'}</span>
                : dq.authorizer
                  ? <span className="iv-seal" style={{ '--sc': '#7C3AED', fontSize: 14 }}>OTORIZE</span>
                  : <span className="tag" style={{ color: '#B45309', background: 'rgba(217,119,6,.12)' }}>An atant</span>}
            </div>
            <div className="meta">
              <div><span>Kliyan</span><b>{clientName || 'San kliyan'}</b></div>
              <div style={{ textAlign: 'right' }}><span>Kreye pa</span><b>{dq.creator?.fullName || '—'}</b></div>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              <div className="iv-rrow"><span>{tr(t, 'directQuotes.subtotalLabel', 'Sou-total')}</span><span className="num">{fmt(dq.subtotalHtg)}</span></div>
              {Number(dq.discountHtg) > 0 && <div className="iv-rrow disc"><span>{tr(t, 'directQuotes.discount', 'Rabè')}</span><span className="num">−{fmt(dq.discountHtg)}</span></div>}
            </div>
            <div className="iv-rtotal">
              <span>Total</span>
              <span className="num">{fmt(dq.totalHtg)}<small>HTG</small></span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1.5px dashed var(--line2)', fontSize: 11 }}>
              <div className="iv-rrow"><span>≈ USD</span><span className="mono">${fmt(Number(dq.totalHtg || 0) / rate)}</span></div>
              <div className="iv-rrow"><span>To</span><span className="mono">1 USD = {rate.toFixed(2)} HTG</span></div>
              {dq.expiryDate && (
                <div className="iv-rrow" style={isExpired ? { color: 'var(--bad)', fontWeight: 800 } : undefined}>
                  <span>{isExpired ? '⚠ Ekspire' : 'Valab jiska'}</span><span>{toHaitiDate(dq.expiryDate, 'dd/MM/yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="iv-printbtns no-print">
            {isPending && isAdmin && (
              <button onClick={() => setAuthModalOpen(true)} className="iv-btn-main" style={{ width: '100%', minHeight: 50, background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', boxShadow: '0 10px 24px rgba(124,58,237,.35)' }}>
                <ShieldCheck size={16}/> Otorize ak PIN
              </button>
            )}
            {canConvert && (
              <button onClick={doConvert} disabled={convertMutation.isPending} className={isPending ? 'iv-act' : 'iv-btn-main'} style={{ width: '100%', minHeight: 50 }}>
                {convertMutation.isPending ? <RefreshCw size={16} className="spin"/> : <FileCheck size={16}/>} {tr(t, 'directQuotes.convertToInvoice', 'Konvèti an fakti')}
              </button>
            )}
            {!locked && (
              <button onClick={handlePrint} disabled={printing} className="iv-act" style={{ width: '100%' }}>
                <Printer size={15}/> {printing ? 'Ap enprime...' : 'Enprime devi a'}
              </button>
            )}
          </div>
        </aside>
      </div>

      {zoom && (
        <div className="iv-lightbox" onClick={() => setZoom(null)}>
          <div>
            <img src={zoom.imageUrl} alt={zoom.description}/>
            <p>{zoom.description}{zoom.size ? ` · ${zoom.size}` : ''}</p>
          </div>
        </div>
      )}

      {shareOpen && <ShareModal dq={dq} phone={phone} clientName={clientName} tenant={tenant} onClose={() => setShareOpen(false)} shareMutation={shareMutation} revokeMutation={revokeMutation}/>}
      {authModalOpen && <AuthorizeModal dq={dq} submitting={authorizeMutation.isPending} onConfirm={(pin) => authorizeMutation.mutate(pin)} onClose={() => setAuthModalOpen(false)}/>}
    </div>
  )
}

// ── Modal Otorizasyon — ADMIN antre PWÒP PIN pa li
function AuthorizeModal({ dq, onConfirm, onClose, submitting }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])
  // ✅ Voye otomatikman lè 4 chif yo antre
  useEffect(() => { if (pin.length === 4 && !submitting) onConfirm(pin) }, [pin]) // eslint-disable-line
  // ✅ PIN pa bon → efase l pou rekòmanse
  const wasSubmitting = useRef(false)
  useEffect(() => {
    if (wasSubmitting.current && !submitting) { setPin(''); inputRef.current?.focus() }
    wasSubmitting.current = submitting
  }, [submitting])

  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 400 }}>
        <div className="iv-sheet-h" style={{ background: 'radial-gradient(120% 140% at 100% 0%, #8B5CF6, #4C1D95 70%)' }}>
          <h3><ShieldCheck size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'directQuotes.enterYourPin', 'Antre PIN ou')}</h3>
          <p>{dq.quoteNumber} · {fmt(dq.totalHtg)} HTG</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <div className="iv-sheet-b" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{tr(t, 'directQuotes.enterPinDesc', 'Se PIN pa w (admin) ki otorize devi sa a.')}</p>
          <div className="iv-pin" onClick={() => inputRef.current?.focus()}>
            {[0, 1, 2, 3].map(i => (
              <span key={i} className={`${pin[i] ? 'on' : ''} ${i === pin.length ? 'cur' : ''}`}>{pin[i] ? '•' : ''}</span>
            ))}
            <input ref={inputRef} type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}/>
          </div>
          {submitting && <p style={{ margin: 0, fontWeight: 700, color: '#7C3AED' }}><RefreshCw size={13} className="spin" style={{ verticalAlign: '-2px' }}/> Ap verifye...</p>}
          <div className="iv-sheet-f" style={{ width: '100%' }}>
            <button type="button" className="iv-act" onClick={() => { setPin(''); onClose() }} disabled={submitting}>Anile</button>
            <button type="button" className="iv-btn-main" disabled={pin.length !== 4 || submitting} onClick={() => onConfirm(pin)}
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>
              <Check size={16}/> {tr(t, 'directQuotes.confirmBtn', 'Konfime')}
            </button>
          </div>
          {pin.length === 4 && !submitting && <button type="button" className="iv-link-btn" style={{ color: 'var(--muted)' }} onClick={() => setPin('')}>Efase PIN nan</button>}
        </div>
      </div>
    </div>
  )
}

// ── Modal Pataje — lyen dirèk san kòd
function ShareModal({ dq, phone, clientName, tenant, onClose, shareMutation, revokeMutation }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const shareUrl = dq.publicToken ? `${window.location.origin}/devi-direk/${dq.publicToken}` : null

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error('Pa ka kopye otomatikman') }
  }

  // ✅ NOUVO — si kliyan an gen nimewo, WhatsApp louvri dirèkteman sou konvèsasyon li
  const msg = tr(t, 'directQuotes.whatsappMessage',
    `Bonjou${clientName ? ' ' + clientName : ''}, men devi ${dq.quoteNumber} (${fmt(dq.totalHtg)} HTG): ${shareUrl}\n\n${tenant?.name || ''}`,
    { url: shareUrl })
  const cleanPhone = (phone || '').replace(/\D/g, '')
  const waUrl = shareUrl ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : null

  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 440 }}>
        <div className="iv-sheet-h">
          <h3><Share2 size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'directQuotes.shareTitle', 'Pataje devi a')}</h3>
          <p>{dq.quoteNumber}{clientName ? ` · ${clientName}` : ''}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <div className="iv-sheet-b">
          {!dq.publicToken ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>{tr(t, 'directQuotes.shareDescription', 'Kreye yon lyen pou kliyan an ka wè devi a ak foto atik yo, dirèkteman nan telefòn li.')}</p>
              <button onClick={() => shareMutation.mutate()} disabled={shareMutation.isPending} className="iv-btn-main" style={{ width: '100%' }}>
                {shareMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Share2 size={16}/>}
                {shareMutation.isPending ? 'Ap kreye...' : tr(t, 'directQuotes.createLinkBtn', 'Kreye lyen pataj')}
              </button>
            </div>
          ) : (
            <>
              <div className="iv-share-url">
                <input readOnly value={shareUrl} className="iv-inp" onFocus={e => e.target.select()}/>
                <button onClick={handleCopy} className={`iv-act icon ${copied ? 'green' : ''}`} style={{ minHeight: 44, width: 44 }}>{copied ? <Check size={17}/> : <Copy size={17}/>}</button>
              </div>
              <a href={waUrl} target="_blank" rel="noreferrer" className="iv-wa">
                <MessageCircle size={18}/> {cleanPhone ? `Voye bay ${clientName || phone}` : tr(t, 'directQuotes.sendWhatsApp', 'Voye sou WhatsApp')}
              </a>
              <button onClick={() => { if (confirm('Revoke lyen sa? Kliyan an p ap ka wè devi a ankò.')) revokeMutation.mutate() }} disabled={revokeMutation.isPending} className="iv-link-btn">
                <RefreshCw size={13}/> {tr(t, 'directQuotes.revokeThisLink', 'Revoke lyen sa a')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}