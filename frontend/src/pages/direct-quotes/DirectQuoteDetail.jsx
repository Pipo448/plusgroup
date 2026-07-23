// src/pages/direct-quotes/DirectQuoteDetail.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, FileCheck, Share2, Copy, Check, MessageCircle,
  Lock, RefreshCw, Trash2, X, Printer, User, ShieldCheck, Clock,
} from 'lucide-react'
import { printDirectQuoteNative, isNativePrinterAvailable } from '../../services/printerNative'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const STATUS_BADGES = { draft:'badge-gray', sent:'badge-blue', accepted:'badge-green', converted:'badge-purple', cancelled:'badge-red' }

export default function DirectQuoteDetail() {
  const { t }       = useTranslation()
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { tenant, user } = useAuthStore()
  const qc          = useQueryClient()

  const [shareOpen, setShareOpen] = useState(false)
  const [printing, setPrinting]   = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const { data: dq, isLoading } = useQuery({
    queryKey: ['direct-quote', id],
    queryFn:  () => api.get(`/direct-quotes/${id}`).then(r => r.data.directQuote),
    staleTime: 30_000,
  })

  const authorizeMutation = useMutation({
    mutationFn: (pin) => api.post(`/direct-quotes/${id}/authorize`, { pin }),
    onSuccess: () => {
      toast.success(t('directQuotes.authorizedSuccess'))
      setAuthModalOpen(false)
      qc.invalidateQueries({ queryKey: ['direct-quote', id] })
    },
    onError: (e) => toast.error(e.response?.data?.message || t('directQuotes.pinIncorrect'))
  })

  const convertMutation = useMutation({
    mutationFn: () => api.post(`/direct-quotes/${id}/convert`),
    onSuccess:  (res) => {
      toast.success(t('directQuotes.convertedSuccess'))
      navigate(`/app/invoices/${res.data.invoice.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('directQuotes.errorConverting'))
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/direct-quotes/${id}/cancel`),
    onSuccess:  () => { toast.success(t('directQuotes.cancelledSuccess')); qc.invalidateQueries(['direct-quote', id]) }
  })

  const shareMutation = useMutation({
    mutationFn: () => api.post(`/direct-quotes/${id}/share`),
    onSuccess:  () => { toast.success(t('directQuotes.linkCreated')); qc.invalidateQueries({ queryKey: ['direct-quote', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || t('directQuotes.errorCreatingLink'))
  })

  const revokeMutation = useMutation({
    mutationFn: () => api.delete(`/direct-quotes/${id}/share`),
    onSuccess:  () => { toast.success(t('directQuotes.linkRevoked')); qc.invalidateQueries({ queryKey: ['direct-quote', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || t('directQuotes.errorRevokingLink'))
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner"/></div>
  if (!dq) return null

  const snap = dq.clientSnapshot || {}
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  // ✅ NOUVO — Devi a "an atant" toutotan pa gen okenn admin ki otorize l
  const isPending = !dq.authorizedBy && dq.status !== 'cancelled'
  // ✅ Kesye pa gen aksè a enprime/pataje/konvèti toutotan devi a an atant
  const actionsLocked = isPending && !isAdmin
  const canShare = dq.status !== 'cancelled' && !actionsLocked

  const handlePrint = async () => {
    if (isNativePrinterAvailable()) {
      setPrinting(true)
      try {
        await printDirectQuoteNative(dq, tenant)
        toast.success(t('directQuotes.printedSuccess'))
      } catch (e) {
        toast.error(e.message || t('directQuotes.errorPrinting'))
      } finally {
        setPrinting(false)
      }
    } else {
      window.print()
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-6" style={{ flexWrap:'wrap', gap:12 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/direct-quotes')} className="btn-ghost p-2 no-print">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">{dq.quoteNumber}</h1>
              <span className={`badge ${STATUS_BADGES[dq.status]}`}>{t(`directQuotes.status.${dq.status}`)}</span>
            </div>
            <p className="text-slate-500 text-sm">{t('directQuotes.subtitleDetail')}</p>
          </div>
        </div>

        <div className="flex gap-2 no-print" style={{ flexWrap:'wrap' }}>
          {/* ✅ NOUVO — Admin wè bouton Otorize a lè devi an atant */}
          {isPending && isAdmin && (
            <button onClick={() => setAuthModalOpen(true)} className="btn-primary btn-sm" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
              <ShieldCheck size={14}/> {t('directQuotes.authorize')}
            </button>
          )}

          {!actionsLocked && (
            <button onClick={handlePrint} disabled={printing} className="btn-secondary btn-sm">
              <Printer size={14}/> {printing ? t('directQuotes.printing') : t('directQuotes.print')}
            </button>
          )}

          {canShare && (
            <button onClick={() => setShareOpen(true)} className="btn-secondary btn-sm">
              <Share2 size={14}/> {t('directQuotes.share')}
            </button>
          )}

          {dq.status === 'draft' && (
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="btn-secondary btn-sm text-red-600">
              <Trash2 size={14}/> {t('directQuotes.cancelBtn')}
            </button>
          )}

          {!actionsLocked && ['draft', 'sent', 'accepted'].includes(dq.status) && (
            <button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending} className="btn-primary btn-sm">
              <FileCheck size={14}/> {convertMutation.isPending ? t('directQuotes.converting') : t('directQuotes.convertToInvoice')}
            </button>
          )}
        </div>
      </div>

      {/* ✅ NOUVO — Banyè "an atant" — diferan mesaj pou kesye vs admin */}
      {isPending && (
        <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-sm text-amber-800">
          <Clock size={15}/>
          {isAdmin ? t('directQuotes.pendingBannerAdmin') : t('directQuotes.pendingBannerCashier')}
        </div>
      )}

      {dq.authorizer && (
        <div className="mb-5 p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-center gap-2 text-sm text-violet-700">
          <Lock size={15}/>
          {t('directQuotes.authorizedByOn', { name: dq.authorizer.fullName, date: new Date(dq.authorizedAt).toLocaleString('fr-FR') })}
        </div>
      )}

      <div className="card p-5 mb-5">
        <h3 className="section-title">{t('directQuotes.clientSection')}</h3>
        <div className="flex items-center gap-2 text-slate-700">
          <User size={15} className="text-slate-400"/>
          <span className="font-medium">{snap.name || t('directQuotes.noClient')}</span>
        </div>
        {snap.phone && <p className="text-sm text-slate-500 mt-1">{snap.phone}</p>}
        <p className="text-xs text-slate-400 mt-3">
          {t('directQuotes.createdByOn', { name: dq.creator?.fullName, date: new Date(dq.createdAt).toLocaleDateString('fr-FR') })}
        </p>
      </div>

      <div className="card overflow-hidden mb-5">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-800">{t('directQuotes.itemsCount', { count: dq.items?.length || 0 })}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-display font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="p-3 text-left pl-4">{t('directQuotes.colProductService')}</th>
                <th className="p-3 text-center">{t('directQuotes.quantity')}</th>
                <th className="p-3 text-right">{t('directQuotes.unitPrice')}</th>
                <th className="p-3 text-right pr-4">{t('directQuotes.totalLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {(dq.items || []).map(it => (
                <tr key={it.id} className="border-b border-slate-50">
                  <td className="p-3 pl-4 text-sm text-slate-700">
                    <div className="flex items-center gap-3">
                      {/* ✅ NOUVO — Foto atik la (si genyen) */}
                      {it.imageUrl && (
                        <img src={it.imageUrl} alt={it.description}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100"/>
                      )}
                      <div>
                        <p className="m-0">{it.description}</p>
                        {it.size && <p className="text-xs text-slate-400 m-0">{t('directQuotes.size')}: {it.size}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center text-sm font-mono">{fmt(it.quantity)}</td>
                  <td className="p-3 text-right text-sm font-mono">{fmt(it.unitPriceHtg)} HTG</td>
                  <td className="p-3 text-right pr-4 text-sm font-mono font-semibold">{fmt(it.totalHtg)} HTG</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="max-w-xs ml-auto space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>{t('directQuotes.subtotalLabel')}</span>
            <span className="font-mono">{fmt(dq.subtotalHtg)} HTG</span>
          </div>
          {Number(dq.discountHtg) > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>{t('directQuotes.discount')}</span>
              <span className="font-mono">-{fmt(dq.discountHtg)} HTG</span>
            </div>
          )}
          <div className="border-t-2 border-brand-200 pt-2 flex justify-between items-center">
            <span className="font-display font-bold text-slate-800">{t('directQuotes.totalLabel')}</span>
            <span className="font-mono font-bold text-brand-700 text-lg">{fmt(dq.totalHtg)} HTG</span>
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareModal
          dq={dq}
          onClose={() => setShareOpen(false)}
          shareMutation={shareMutation}
          revokeMutation={revokeMutation}
        />
      )}

      {authModalOpen && (
        <AuthorizeModal
          submitting={authorizeMutation.isPending}
          onConfirm={(pin) => authorizeMutation.mutate(pin)}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  )
}

// ── Modal Otorizasyon (ADMIN antre PWÒP PIN pa li — pa kesye a)
function AuthorizeModal({ onConfirm, onClose, submitting }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-violet-600"/>
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800">{t('directQuotes.enterYourPin')}</h3>
            <p className="text-xs text-slate-500">{t('directQuotes.enterPinDesc')}</p>
          </div>
        </div>
        <input
          type="password" inputMode="numeric" maxLength={4} autoFocus
          className="input text-center text-2xl tracking-[0.5em] font-bold py-3"
          placeholder="••••"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => { if (e.key === 'Enter' && pin.length === 4) onConfirm(pin) }}
        />
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('directQuotes.cancelBtn')}</button>
          <button type="button" disabled={pin.length !== 4 || submitting} onClick={() => onConfirm(pin)}
            className="btn-primary flex-1" style={{ justifyContent: 'center' }}>
            {submitting ? t('directQuotes.confirming') : t('directQuotes.confirmBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Pataje (senp — lyen dirèk san kòd)
function ShareModal({ dq, onClose, shareMutation, revokeMutation }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const shareUrl = dq.publicToken ? `${window.location.origin}/devi-direk/${dq.publicToken}` : null

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(t('directQuotes.whatsappMessage', { url: shareUrl }))}`
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
            <Share2 size={17}/> {t('directQuotes.shareTitle')}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>

        {!dq.publicToken ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-4">{t('directQuotes.shareDescription')}</p>
            <button onClick={() => shareMutation.mutate()} disabled={shareMutation.isPending} className="btn-primary">
              <Share2 size={15}/> {shareMutation.isPending ? t('directQuotes.creatingLink') : t('directQuotes.createLinkBtn')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <input readOnly value={shareUrl} className="input flex-1 text-xs font-mono"/>
              <button onClick={handleCopy} className="btn-secondary p-2.5">
                {copied ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}
              </button>
            </div>
            <a href={waUrl} target="_blank" rel="noreferrer" className="btn-primary w-full mb-3" style={{ justifyContent:'center', background:'#25D366' }}>
              <MessageCircle size={16}/> {t('directQuotes.sendWhatsApp')}
            </a>
            <button onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending}
              className="text-red-500 text-sm font-medium flex items-center gap-1.5 mx-auto hover:text-red-700">
              <RefreshCw size={13}/> {t('directQuotes.revokeThisLink')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
