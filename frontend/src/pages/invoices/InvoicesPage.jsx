// src/pages/invoices/InvoicesPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { invoiceAPI } from '../../services/api'
import { Search, Receipt, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
const STATUS_BADGES = { unpaid:'badge-red', partial:'badge-yellow', paid:'badge-green', cancelled:'badge-gray', refunded:'badge-blue' }
const STATUS_LABELS = { unpaid:'Impaye', partial:'Pasyal', paid:'Peye', cancelled:'Anile', refunded:'Remèt' }

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, status, page],
    queryFn: () => invoiceAPI.getAll({ search, status, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facture</h1>
          <p className="text-slate-500 text-sm">{data?.total || 0} facture total</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Nimewo oswa kliyan..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-40" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tout statut</option>
          {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nimewo</th><th>Kliyan</th><th>Total HTG</th>
              <th>Peye</th><th>Balans</th><th>Statut</th><th>Dat</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array(5).fill(0).map((_,i) => <tr key={i}><td colSpan={8}><div className="h-5 bg-slate-100 rounded animate-pulse my-1" /></td></tr>)
             : !data?.invoices?.length
             ? <tr><td colSpan={8}><div className="empty-state py-12"><Receipt size={40} className="text-slate-300 mb-2" /><p className="text-slate-500">Okenn facture jwenn</p></div></td></tr>
             : data.invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="font-mono text-brand-700 font-semibold">{inv.invoiceNumber}</td>
                  <td>{inv.client?.name || '—'}</td>
                  <td className="font-mono font-medium">{fmt(inv.totalHtg)}</td>
                  <td className="font-mono text-emerald-600">{fmt(inv.amountPaidHtg)}</td>
                  <td className="font-mono text-red-600">{fmt(inv.balanceDueHtg)}</td>
                  <td><span className={STATUS_BADGES[inv.status] || 'badge-gray'}>{STATUS_LABELS[inv.status]}</span></td>
                  <td className="text-slate-500 text-xs">{format(new Date(inv.issueDate), 'dd/MM/yyyy')}</td>
                  <td><Link to={`/invoices/${inv.id}`} className="btn-ghost btn-sm p-1.5"><Eye size={14} /></Link></td>
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
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="btn-secondary btn-sm p-2"><ChevronLeft size={16} /></button>
            <button disabled={page>=data.pages} onClick={() => setPage(p=>p+1)} className="btn-secondary btn-sm p-2"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
