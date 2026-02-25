// src/pages/clients/ClientsPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientAPI } from '../../services/api'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, Users, X, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

const ClientModal = ({ client, onClose, onSaved }) => {
  const { t } = useTranslation()
  const isEdit = !!client
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({ defaultValues: client || { clientType: 'individual' } })

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? clientAPI.update(client.id, data) : clientAPI.create(data),
    onSuccess: () => {
      toast.success(isEdit ? t('clients.updated') : t('clients.created'))
      qc.invalidateQueries(['clients'])
      onSaved?.()
    }
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-display font-bold">
            {isEdit ? t('clients.editClient') : t('clients.newClient')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('clients.name')} *</label>
              <input className="input" placeholder={t('clients.namePlaceholder')} {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">{t('clients.type')}</label>
              <select className="input" {...register('clientType')}>
                <option value="individual">{t('clients.individual')}</option>
                <option value="company">{t('clients.company')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('clients.phone')}</label>
              <input className="input" placeholder="+509 3000-0000" {...register('phone')} />
            </div>
            <div>
              <label className="label">{t('clients.email')}</label>
              <input type="email" className="input" placeholder="email@ex.com" {...register('email')} />
            </div>
          </div>
          <div>
            <label className="label">{t('clients.address')}</label>
            <input className="input" placeholder={t('clients.addressPlaceholder')} {...register('address')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('clients.nif')}</label>
              <input className="input" placeholder={t('clients.nifPlaceholder')} {...register('nif')} />
            </div>
            <div>
              <label className="label">{t('clients.preferredCurrency')}</label>
              <select className="input" {...register('preferredCurrency')}>
                <option value="HTG">HTG — {t('quotes.gourde')}</option>
                <option value="USD">USD — {t('quotes.dollar')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? t('common.saving') : isEdit ? t('common.update') : t('clients.createBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const { t } = useTranslation()
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: () => clientAPI.getAll({ search, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => clientAPI.remove(id),
    onSuccess: () => { toast.success(t('clients.deleted')); qc.invalidateQueries(['clients']) }
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.clients')}</h1>
          <p className="text-slate-500 text-sm">{data?.total || 0} {t('clients.total')}</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary">
          <Plus size={16} /> {t('clients.newClient')}
        </button>
      </div>

      <div className="relative max-w-sm mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder={t('clients.searchPlaceholder')}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? Array(6).fill(0).map((_,i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded mb-3 w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))
          : !data?.clients?.length
          ? (
              <div className="col-span-3 empty-state">
                <Users size={40} className="text-slate-300 mb-2" />
                <p className="text-slate-500">{t('clients.noClients')}</p>
              </div>
            )
          : data.clients.map(c => (
              <div key={c.id} className="card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-slate-800">{c.name}</p>
                      <span className={c.clientType === 'company' ? 'badge-blue text-[10px]' : 'badge-gray text-[10px]'}>
                        {c.clientType === 'company' ? t('clients.company') : t('clients.individual')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ type: 'edit', client: c })} className="btn-ghost btn-sm p-1.5"><Edit2 size={13} /></button>
                    <button onClick={() => { if (confirm(t('clients.deleteConfirm'))) deleteMutation.mutate(c.id) }} className="btn-ghost btn-sm p-1.5 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-slate-500">
                  {c.phone && <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" />{c.phone}</div>}
                  {c.email && <div className="flex items-center gap-2"><Mail size={13} className="text-slate-400" />{c.email}</div>}
                  {c.address && <div className="flex items-center gap-2"><MapPin size={13} className="text-slate-400" />{c.address}</div>}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span>{c._count?.invoices || 0} {t('clients.invoices')}</span>
                  <span>·</span>
                  <span>{c._count?.quotes || 0} {t('clients.quotes')}</span>
                </div>
              </div>
            ))
        }
      </div>

      {data?.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">{t('invoices.page')} {page} / {data.pages}</p>
          <div className="flex gap-1">
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="btn-secondary btn-sm p-2"><ChevronLeft size={16} /></button>
            <button disabled={page>=data.pages} onClick={() => setPage(p=>p+1)} className="btn-secondary btn-sm p-2"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {modal?.type === 'create' && <ClientModal onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
      {modal?.type === 'edit' && <ClientModal client={modal.client} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
    </div>
  )
}
