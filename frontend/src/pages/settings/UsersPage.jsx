// src/pages/settings/UsersPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Edit2, Users, X, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

const fetchUsers = () => api.get('/users').then(r => r.data.users)

const ROLES = [
  { value: 'admin',         label: 'Admin',          desc: 'Aksè konplè' },
  { value: 'cashier',       label: 'Kasye',          desc: 'Devis ak facture' },
  { value: 'stock_manager', label: 'Jestè Stock',    desc: 'Pwodui ak estòk' },
  { value: 'viewer',        label: 'Obsèvatè',       desc: 'Wè sèlman' },
]

const UserModal = ({ user, onClose, onSaved }) => {
  const isEdit = !!user
  const qc = useQueryClient()
  const [showPwd, setShowPwd] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: user || { role: 'cashier', preferredLang: 'ht' }
  })

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/users/${user.id}`, data)
      : api.post('/users', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Itilizatè ajou!' : 'Itilizatè kreye!')
      qc.invalidateQueries(['users'])
      onSaved?.()
    }
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-display font-bold text-lg">{isEdit ? 'Modifye Itilizatè' : 'Nouvo Itilizatè'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="label">Non Konplè *</label>
            <input className="input" placeholder="Jean Baptiste" {...register('fullName', { required: true })} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" placeholder="user@entreprise.ht"
              {...register('email', { required: !isEdit })}
              disabled={isEdit} />
          </div>
          {!isEdit && (
            <div>
              <label className="label">Modpas *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className="input pr-10"
                  placeholder="Min. 8 karaktè"
                  {...register('password', { required: true, minLength: 8 })} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="label">Rôl</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-all">
                  <input type="radio" value={r.value} {...register('role')} className="text-brand-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.label}</p>
                    <p className="text-xs text-slate-400">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefòn</label>
              <input className="input" placeholder="+509 3000-0000" {...register('phone')} />
            </div>
            <div>
              <label className="label">Lang preferé</label>
              <select className="input" {...register('preferredLang')}>
                <option value="ht">Kreyòl</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="w-4 h-4 text-brand-600 rounded" />
              <span className="text-sm text-slate-600">Kont aktif</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">Anile</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Ap sovgade...' : isEdit ? 'Mete ajou' : 'Kreye Itilizatè'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [modal, setModal] = useState(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  })

  const ROLE_BADGE = {
    admin:         'badge-purple',
    cashier:       'badge-blue',
    stock_manager: 'badge-yellow',
    viewer:        'badge-gray',
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/settings" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="page-title">Itilizatè</h1>
          <p className="text-slate-500 text-sm">{users?.length || 0} itilizatè</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary">
            <Plus size={16} /> Nouvo Itilizatè
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array(3).fill(0).map((_,i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1"><div className="h-4 bg-slate-200 rounded w-1/3 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/4" /></div>
                </div>
              </div>
            ))
          : users?.map(u => (
              <div key={u.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold flex-shrink-0">
                  {u.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-display font-semibold text-slate-800">{u.fullName}</p>
                    <span className={ROLE_BADGE[u.role] || 'badge-gray'}>
                      {ROLES.find(r => r.value === u.role)?.label || u.role}
                    </span>
                    {!u.isActive && <span className="badge-red">Inaktif</span>}
                  </div>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  {u.lastLoginAt && (
                    <p className="text-xs text-slate-400">
                      Dènye koneksyon: {format(new Date(u.lastLoginAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  )}
                </div>
                <button onClick={() => setModal({ type: 'edit', user: u })} className="btn-ghost btn-sm">
                  <Edit2 size={14} />
                </button>
              </div>
            ))
        }
      </div>

      {modal?.type === 'create' && <UserModal onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
      {modal?.type === 'edit' && <UserModal user={modal.user} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
    </div>
  )
}
