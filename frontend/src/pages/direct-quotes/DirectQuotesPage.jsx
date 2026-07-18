// src/pages/direct-quotes/DirectQuotesPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Plus, Search, FileText, User, ChevronLeft, ChevronRight, Lock } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_CFG = {
  draft:     { label: 'Bouyon',   color: '#6B7AAB', bg: 'rgba(107,122,171,0.1)'  },
  sent:      { label: 'Voye',     color: '#2563eb', bg: 'rgba(37,99,235,0.1)'    },
  accepted:  { label: 'Aksepte',  color: '#059669', bg: 'rgba(5,150,105,0.1)'    },
  converted: { label: 'Konvèti',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'   },
  cancelled: { label: 'Anile',    color: '#dc2626', bg: 'rgba(220,38,38,0.1)'    },
}

export default function DirectQuotesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['direct-quotes', search, page],
    queryFn: () => api.get('/direct-quotes', { params: { search, page, limit: 15 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const list = data?.directQuotes || []

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Devi Dirèk</h1>
          <p className="text-slate-500 text-sm">Devi pou pwodui/sèvis ki pa nan katalòg estòk la — separe de rapò lavant</p>
        </div>
        <button onClick={() => navigate('/app/direct-quotes/new')} className="btn-primary">
          <Plus size={16}/> Nouvo Devi Dirèk
        </button>
      </div>

      <div className="card p-4 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            className="input pl-9"
            placeholder="Chèche pa nimewo devi oswa non kliyan..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Chajman...</div>
        ) : !list.length ? (
          <div className="p-12 text-center">
            <FileText size={36} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-500">Pa gen okenn Devi Dirèk pou kounye a.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs font-display font-semibold text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="p-3 text-left pl-4">Nimewo</th>
                  <th className="p-3 text-left">Kliyan</th>
                  <th className="p-3 text-left">Kreye Pa</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Estati</th>
                </tr>
              </thead>
              <tbody>
                {list.map(dq => {
                  const cfg = STATUS_CFG[dq.status] || STATUS_CFG.draft
                  return (
                    <tr key={dq.id} onClick={() => navigate(`/app/direct-quotes/${dq.id}`)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                      <td className="p-3 pl-4 font-mono text-sm font-semibold text-slate-700">{dq.quoteNumber}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <User size={13} className="text-slate-300"/>
                          {dq.client?.name || 'San kliyan'}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          {dq.creator?.fullName}
                          {dq.authorizer && (
                            <span title={`Otorize pa ${dq.authorizer.fullName}`}>
                              <Lock size={11} className="text-violet-400"/>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-sm font-bold text-slate-700">{fmt(dq.totalHtg)} HTG</td>
                      <td className="p-3 text-center">
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                          fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">Paj {data.page} sou {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronLeft size={16}/>
              </button>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
