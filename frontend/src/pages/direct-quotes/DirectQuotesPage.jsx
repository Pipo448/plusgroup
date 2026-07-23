// src/pages/direct-quotes/DirectQuotesPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { Plus, Search, FileText, User, ChevronLeft, ChevronRight, Lock } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_COLORS = {
  draft:     { color: '#6B7AAB', bg: 'rgba(107,122,171,0.1)'  },
  sent:      { color: '#2563eb', bg: 'rgba(37,99,235,0.1)'    },
  accepted:  { color: '#059669', bg: 'rgba(5,150,105,0.1)'    },
  converted: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'   },
  cancelled: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)'    },
}

export default function DirectQuotesPage() {
  const { t } = useTranslation()
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
          <h1 className="page-title">{t('directQuotes.title')}</h1>
          <p className="text-slate-500 text-sm">{t('directQuotes.subtitle')}</p>
        </div>
        <button onClick={() => navigate('/app/direct-quotes/new')} className="btn-primary">
          <Plus size={16}/> {t('directQuotes.newDirectQuote')}
        </button>
      </div>

      <div className="card p-4 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            className="input pl-9"
            placeholder={t('directQuotes.searchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">{t('common.loading')}</div>
        ) : !list.length ? (
          <div className="p-12 text-center">
            <FileText size={36} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-500">{t('directQuotes.noResults')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs font-display font-semibold text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="p-3 text-left pl-4">{t('directQuotes.colNumber')}</th>
                  <th className="p-3 text-left">{t('directQuotes.colClient')}</th>
                  <th className="p-3 text-left">{t('directQuotes.colCreatedBy')}</th>
                  <th className="p-3 text-right">{t('directQuotes.colTotal')}</th>
                  <th className="p-3 text-center">{t('directQuotes.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map(dq => {
                  const colors = STATUS_COLORS[dq.status] || STATUS_COLORS.draft
                  const label = t(`directQuotes.status.${dq.status}`)
                  return (
                    <tr key={dq.id} onClick={() => navigate(`/app/direct-quotes/${dq.id}`)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                      <td className="p-3 pl-4 font-mono text-sm font-semibold text-slate-700">{dq.quoteNumber}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <User size={13} className="text-slate-300"/>
                          {dq.client?.name || t('directQuotes.noClient')}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          {dq.creator?.fullName}
                          {dq.authorizer && (
                            <span title={t('directQuotes.authorizedByTooltip', { name: dq.authorizer.fullName })}>
                              <Lock size={11} className="text-violet-400"/>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-sm font-bold text-slate-700">{fmt(dq.totalHtg)} HTG</td>
                      <td className="p-3 text-center">
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                          fontSize: 11, fontWeight: 700, color: colors.color, background: colors.bg,
                        }}>
                          {label}
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
            <span className="text-xs text-slate-400">{t('products.page')} {data.page} / {data.pages}</span>
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
