// src/pages/stock/StockPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockAPI, productAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Warehouse, TrendingUp, TrendingDown, Settings2, Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const MOVEMENT_LABELS = { sale:'Vant', purchase:'Achte', adjustment:'Ajisteman', return_item:'Retou', loss:'Pèt', transfer:'Transfè' }
const MOVEMENT_COLORS = { sale:'text-red-600 bg-red-50', purchase:'text-emerald-600 bg-emerald-50', adjustment:'text-blue-600 bg-blue-50', return_item:'text-purple-600 bg-purple-50', loss:'text-orange-600 bg-orange-50', transfer:'text-slate-600 bg-slate-50' }

const AdjustModal = ({ onClose }) => {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ quantity: '', type: 'add', notes: '' })

  const { data: products } = useQuery({
    queryKey: ['products-adj', search],
    queryFn: () => productAPI.getAll({ search, limit: 6 }).then(r => r.data.products),
    enabled: search.length > 0
  })

  const mutation = useMutation({
    mutationFn: (data) => stockAPI.adjust(data),
    onSuccess: () => { toast.success('Stock ajiste!'); qc.invalidateQueries(['stock-movements']); qc.invalidateQueries(['products']); onClose() }
  })

  const purchaseMutation = useMutation({
    mutationFn: (data) => stockAPI.purchase(data),
    onSuccess: () => { toast.success('Stock ajoute!'); qc.invalidateQueries(['stock-movements']); qc.invalidateQueries(['products']); onClose() }
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-display font-bold text-lg">Ajisteman Stock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Pwodui</label>
            {selected
              ? <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-200 rounded-lg">
                  <div><p className="font-medium text-brand-800">{selected.name}</p><p className="text-xs text-brand-600 font-mono">Stock: {Number(selected.quantity)}</p></div>
                  <button onClick={() => setSelected(null)} className="text-brand-400 hover:text-brand-700">✕</button>
                </div>
              : <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-8" placeholder="Chèche pwodui..."
                      value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  {products?.map(p => (
                    <button key={p.id} type="button" onClick={() => { setSelected(p); setSearch('') }}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg text-left transition-all mt-1">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{Number(p.quantity)} {p.unit}</p>
                    </button>
                  ))}
                </>
            }
          </div>

          <div>
            <label className="label">Tip mouvman</label>
            <div className="grid grid-cols-2 gap-2">
              {[{v:'add',l:'Ajoute +'},{v:'remove',l:'Retire -'},{v:'purchase',l:'Achte'},{v:'loss',l:'Pèt'}].map(opt => (
                <button key={opt.v} type="button"
                  onClick={() => setForm({...form, type: opt.v})}
                  className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${form.type === opt.v ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Kantite</label>
            <input type="number" step="0.001" min="0.001" className="input"
              placeholder="0" value={form.quantity}
              onChange={e => setForm({...form, quantity: e.target.value})} />
          </div>

          <div>
            <label className="label">Nòt (opsyonèl)</label>
            <input className="input" placeholder="Rezon ajisteman..."
              value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="btn-secondary">Anile</button>
            <button onClick={() => {
              if (!selected) return toast.error('Chwazi yon pwodui.')
              if (!form.quantity || Number(form.quantity) <= 0) return toast.error('Kantite obligatwa.')
              if (form.type === 'purchase') {
                purchaseMutation.mutate({ productId: selected.id, quantity: Number(form.quantity), notes: form.notes })
              } else {
                mutation.mutate({ productId: selected.id, quantity: Number(form.quantity), type: form.type === 'add' ? 'add' : 'remove', notes: form.notes })
              }
            }} className="btn-primary">Konfime</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StockPage() {
  const [showAdjust, setShowAdjust] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', typeFilter, page],
    queryFn: () => stockAPI.getMovements({ type: typeFilter, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Jesyon Stock</h1>
          <p className="text-slate-500 text-sm">{data?.total || 0} mouvman</p>
        </div>
        <button onClick={() => setShowAdjust(true)} className="btn-primary">
          <Plus size={16} /> Ajiste Stock
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <select className="input w-44" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">Tout tip</option>
          {Object.entries(MOVEMENT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Pwodui</th><th>Tip</th><th className="text-center">Avan</th><th className="text-center">Chanjman</th><th className="text-center">Apre</th><th>Pa</th><th>Dat</th></tr>
          </thead>
          <tbody>
            {isLoading ? Array(5).fill(0).map((_,i) => <tr key={i}><td colSpan={7}><div className="h-5 bg-slate-100 rounded animate-pulse my-1" /></td></tr>)
             : !data?.movements?.length
             ? <tr><td colSpan={7}><div className="empty-state py-12"><Warehouse size={40} className="text-slate-300 mb-2" /><p className="text-slate-500">Okenn mouvman</p></div></td></tr>
             : data.movements.map(m => (
                <tr key={m.id}>
                  <td><p className="font-medium">{m.product?.name}</p><p className="text-xs text-slate-400 font-mono">{m.product?.code}</p></td>
                  <td><span className={`badge text-xs ${MOVEMENT_COLORS[m.movementType]}`}>{MOVEMENT_LABELS[m.movementType]}</span></td>
                  <td className="text-center font-mono text-slate-500">{Number(m.quantityBefore)}</td>
                  <td className="text-center">
                    <span className={`font-mono font-bold ${Number(m.quantityChange) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Number(m.quantityChange) > 0 ? '+' : ''}{Number(m.quantityChange)}
                    </span>
                  </td>
                  <td className="text-center font-mono font-semibold">{Number(m.quantityAfter)}</td>
                  <td className="text-xs text-slate-500">{m.creator?.fullName || '—'}</td>
                  <td className="text-xs text-slate-400">{format(new Date(m.createdAt), 'dd/MM/yy HH:mm')}</td>
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

      {showAdjust && <AdjustModal onClose={() => setShowAdjust(false)} />}
    </div>
  )
}
