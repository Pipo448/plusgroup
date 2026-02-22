// src/pages/quotes/QuoteDetail.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { quoteAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit2, Send, CheckCircle, XCircle, Printer, FileCheck } from 'lucide-react'
import { format } from 'date-fns'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const STATUS_BADGES = { draft:'badge-gray', sent:'badge-blue', accepted:'badge-green', converted:'badge-purple', cancelled:'badge-red' }
const STATUS_LABELS = { draft:'Bouyon', sent:'Voye', accepted:'Aksepte', converted:'Konvèti', cancelled:'Anile' }

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const qc = useQueryClient()

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quoteAPI.getOne(id).then(r => r.data.quote)
  })

  const convertMutation = useMutation({
    mutationFn: () => quoteAPI.convert(id),
    onSuccess: (res) => {
      toast.success('Devis konvèti an facture!')
      navigate(`/invoices/${res.data.invoice.id}`)
    }
  })

  const cancelMutation = useMutation({
    mutationFn: () => quoteAPI.cancel(id),
    onSuccess: () => { toast.success('Devis anile.'); qc.invalidateQueries(['quote', id]) }
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!quote) return null

  const snap = quote.clientSnapshot || {}

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotes')} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">{quote.quoteNumber}</h1>
              <span className={STATUS_BADGES[quote.status] || 'badge-gray'}>{STATUS_LABELS[quote.status]}</span>
            </div>
            <p className="text-slate-500 text-sm">{format(new Date(quote.issueDate), 'dd MMMM yyyy')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {['draft','sent'].includes(quote.status) && (
            <Link to={`/quotes/${id}/edit`} className="btn-secondary btn-sm"><Edit2 size={14} /> Modifye</Link>
          )}
          {['draft','sent','accepted'].includes(quote.status) && (
            <button onClick={() => { if (confirm('Konvèti an facture?')) convertMutation.mutate() }}
              disabled={convertMutation.isPending}
              className="btn-primary">
              <FileCheck size={16} /> Konvèti an Facture
            </button>
          )}
          {quote.status === 'converted' && quote.invoice && (
            <Link to={`/invoices/${quote.invoice.id}`} className="btn-primary">
              <FileCheck size={16} /> Wè Facture {quote.invoice.invoiceNumber}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Infos client */}
          <div className="card p-5">
            <h3 className="section-title">Kliyan</h3>
            {snap.name
              ? <div><p className="font-semibold text-slate-800">{snap.name}</p>
                  {snap.phone && <p className="text-sm text-slate-500">{snap.phone}</p>}
                  {snap.email && <p className="text-sm text-slate-500">{snap.email}</p>}
                </div>
              : <p className="text-slate-400 italic">San kliyan</p>
            }
          </div>

          {/* Articles */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">Atik yo ({quote.items?.length || 0})</h3>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Pwodui</th>
                  <th className="text-center">Qte</th>
                  <th className="text-right">Pri U.</th>
                  <th className="text-center">Rem.</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items?.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium">{item.product?.name || item.productSnapshot?.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{item.product?.code || item.productSnapshot?.code}</p>
                    </td>
                    <td className="text-center font-mono">{Number(item.quantity)}</td>
                    <td className="text-right font-mono">{fmt(item.unitPriceHtg)} HTG</td>
                    <td className="text-center text-slate-500">{Number(item.discountPct) > 0 ? `${item.discountPct}%` : '—'}</td>
                    <td className="text-right font-mono font-semibold">{fmt(item.totalHtg)} HTG</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {quote.notes && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nòt</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Totaux */}
        <div>
          <div className="card p-5">
            <h3 className="font-display font-bold text-slate-800 mb-4">Totaux</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span className="font-mono">{fmt(quote.subtotalHtg)} HTG</span></div>
              {Number(quote.discountHtg) > 0 && <div className="flex justify-between text-red-600"><span>Remiz</span><span className="font-mono">-{fmt(quote.discountHtg)} HTG</span></div>}
              {Number(quote.taxHtg) > 0 && <div className="flex justify-between"><span>TVA ({Number(quote.taxRate)}%)</span><span className="font-mono">{fmt(quote.taxHtg)} HTG</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200 mt-2">
                <span>TOTAL</span>
                <span className="font-mono text-brand-700">{fmt(quote.totalHtg)} HTG</span>
              </div>
              <div className="flex justify-between text-slate-400 text-xs">
                <span>≈ USD</span>
                <span className="font-mono">{fmt(quote.totalUsd)} USD</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between"><span>Taux:</span><span className="font-mono">1 USD = {Number(quote.exchangeRate || 132).toFixed(2)} HTG</span></div>
              <div className="flex justify-between"><span>Devise:</span><span>{quote.currency}</span></div>
              {quote.expiryDate && <div className="flex justify-between"><span>Ekspire:</span><span>{format(new Date(quote.expiryDate), 'dd/MM/yyyy')}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
