// src/pages/quotes/QuotesPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { quoteAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  Plus, Search, FileText, Eye, Edit2, Send,
  XCircle, ArrowRight, CheckCircle, ChevronLeft, ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'

const STATUS_BADGES = {
  draft:     'badge-gray',
  sent:      'badge-blue',
  accepted:  'badge-green',
  converted: 'badge-purple',
  cancelled: 'badge-red',
  expired:   'badge-yellow',
}

const STATUS_LABELS = {
  draft:     'Bouyon',
  sent:      'Voye',
  accepted:  'Aksepte',
  converted: 'Konvèti',
  cancelled: 'Anile',
  expired:   'Ekspire',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

export default function QuotesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', search, status, page],
    queryFn: () => quoteAPI.getAll({ search, status, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true
  })

  const convertMutation = useMutation({
    mutationFn: (id) => quoteAPI.convert(id),
    onSuccess: (res) => {
      toast.success('Devis konvèti an facture!')
      qc.invalidateQueries(['quotes'])
      navigate(`/invoices/${res.data.invoice.id}`)
    }
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => quoteAPI.cancel(id),
    onSuccess: () => { toast.success('Devis anile.'); qc.invalidateQueries(['quotes']) }
  })

  const sendMutation = useMutation({
    mutationFn: (id) => quoteAPI.send(id),
    onSuccess: () => { toast.success('Devis voye.'); qc.invalidateQueries(['quotes']) }
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Devis</h1>
          <p className="text-slate-500 text-sm">{data?.total || 0} devis total</p>
        </div>
        <Link to="/quotes/new" className="btn-primary">
          <Plus size={16} /> Nouvo Devis
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Nimewo oswa kliyan..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-44"
          value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tout statut</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nimewo</th>
              <th>Kliyan</th>
              <th>Total HTG</th>
              <th>Statut</th>
              <th>Dat</th>
              <th>Ekspire</th>
              <th>Aksyon</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7}>
                    <div className="h-5 bg-slate-100 rounded animate-pulse my-1" />
                  </td></tr>
                ))
              : !data?.quotes?.length
              ? <tr><td colSpan={7}>
                  <div className="empty-state py-12">
                    <FileText size={40} className="text-slate-300 mb-2" />
                    <p className="text-slate-500">Okenn devis jwenn</p>
                    <Link to="/quotes/new" className="btn-primary btn-sm mt-3">
                      <Plus size={14} /> Kreye premye devis ou
                    </Link>
                  </div>
                </td></tr>
              : data.quotes.map(q => (
                  <tr key={q.id}>
                    <td className="font-mono text-brand-700 font-semibold">{q.quoteNumber}</td>
                    <td>{q.client?.name || <span className="text-slate-400 italic">San kliyan</span>}</td>
                    <td className="font-mono font-medium">{fmt(q.totalHtg)} HTG</td>
                    <td>
                      <span className={STATUS_BADGES[q.status] || 'badge-gray'}>
                        {STATUS_LABELS[q.status] || q.status}
                      </span>
                    </td>
                    <td className="text-slate-500 text-xs">{format(new Date(q.issueDate), 'dd/MM/yyyy')}</td>
                    <td className="text-xs">
                      {q.expiryDate
                        ? <span className={new Date(q.expiryDate) < new Date() ? 'text-red-500' : 'text-slate-500'}>
                            {format(new Date(q.expiryDate), 'dd/MM/yyyy')}
                          </span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/quotes/${q.id}`} className="btn-ghost btn-sm p-1.5" title="Detay">
                          <Eye size={14} />
                        </Link>
                        {['draft','sent'].includes(q.status) && (
                          <Link to={`/quotes/${q.id}/edit`} className="btn-ghost btn-sm p-1.5" title="Modifye">
                            <Edit2 size={14} />
                          </Link>
                        )}
                        {q.status === 'draft' && (
                          <button onClick={() => sendMutation.mutate(q.id)}
                            className="btn-ghost btn-sm p-1.5 hover:text-blue-600" title="Voye">
                            <Send size={14} />
                          </button>
                        )}
                        {['draft','sent','accepted'].includes(q.status) && (
                          <button
                            onClick={() => {
                              if (confirm('Konvèti devis sa an facture finale?')) convertMutation.mutate(q.id)
                            }}
                            className="btn-ghost btn-sm p-1.5 hover:text-emerald-600" title="Konvèti">
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {!['converted','cancelled'].includes(q.status) && (
                          <button
                            onClick={() => { if (confirm('Anile devis sa?')) cancelMutation.mutate(q.id) }}
                            className="btn-ghost btn-sm p-1.5 hover:text-red-600" title="Anile">
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {data?.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Paj {page} / {data.pages}</p>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn-secondary btn-sm p-2">
              <ChevronLeft size={16} />
            </button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p+1)} className="btn-secondary btn-sm p-2">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
