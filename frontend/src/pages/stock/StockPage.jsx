// src/pages/stock/StockPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockAPI, productAPI } from '../../services/api'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Warehouse, Plus, Search, ChevronLeft, ChevronRight, Package, RefreshCw, X } from 'lucide-react'
import { format } from 'date-fns'

const S = {
  blue:     '#1B2A8F',
  blueLt:   '#2D3FBF',
  blueDim:  'rgba(27,42,143,0.08)',
  orange:   '#FF6B00',
  orangeLt: '#FF8C33',
  orangeDim:'rgba(255,107,0,0.1)',
  white:    '#FFFFFF',
  bg:       '#F4F6FF',
  card:     '#FFFFFF',
  border:   'rgba(27,42,143,0.12)',
  text:     '#0F1A5C',
  muted:    '#6B7AAB',
  success:  '#059669',
  danger:   '#DC2626',
  successBg:'rgba(5,150,105,0.08)',
  dangerBg: 'rgba(220,38,38,0.08)',
}

const MOVEMENT_KEYS = {
  sale:        'stock.sale',
  purchase:    'stock.purchase',
  adjustment:  'stock.adjustment',
  return_item: 'stock.return',
  loss:        'stock.loss',
  transfer:    'stock.transfer',
}

const MOVEMENT_STYLES = {
  sale:        { color:'#DC2626',  bg:'rgba(220,38,38,0.08)',   icon:'↓' },
  purchase:    { color:'#059669',  bg:'rgba(5,150,105,0.08)',   icon:'↑' },
  adjustment:  { color:'#1B2A8F', bg:'rgba(27,42,143,0.08)',   icon:'⟳' },
  return_item: { color:'#7C3AED', bg:'rgba(124,58,237,0.08)',  icon:'↩' },
  loss:        { color:'#FF6B00', bg:'rgba(255,107,0,0.1)',    icon:'!' },
  transfer:    { color:'#0284C7', bg:'rgba(2,132,199,0.08)',   icon:'⇄' },
}

// ── Hook responsive
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ── Modal Ajisteman
const AdjustModal = ({ onClose }) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState({ quantity: '', type: 'add', notes: '' })

  const { data: products } = useQuery({
    queryKey: ['products-adj', search],
    queryFn: () => productAPI.getAll({ search, limit: 6 }).then(r => r.data.products),
    enabled: search.length > 0,
  })

  const mutation = useMutation({
    mutationFn: (data) => stockAPI.addMovement(data),
    onSuccess: () => {
      toast.success(t('stock.adjusted'))
      qc.invalidateQueries(['stock-movements'])
      qc.invalidateQueries(['products'])
      onClose()
    },
  })

  const TYPES = [
    { v: 'add',      lKey: 'stock.add',      icon: '＋', color: S.success },
    { v: 'remove',   lKey: 'stock.remove',   icon: '－', color: S.danger  },
    { v: 'purchase', lKey: 'stock.purchase', icon: '🛒', color: S.blue    },
    { v: 'loss',     lKey: 'stock.loss',     icon: '⚠',  color: S.orange  },
  ]

  const handleConfirm = () => {
    if (!selected) return toast.error(t('stock.selectProduct'))
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error(t('stock.quantityRequired'))
    const typeMap = { add: 'add', remove: 'remove', purchase: 'purchase', loss: 'loss' }
    mutation.mutate({
      productId: selected.id,
      quantity:  Number(form.quantity),
      type:      typeMap[form.type] || 'add',
      notes:     form.notes,
    })
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(10,15,50,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center', padding: isMobile ? 0 : 16,
      }}
    >
      <div style={{
        background: S.card,
        borderRadius: isMobile ? '20px 20px 0 0' : 20,
        width: '100%',
        maxWidth: isMobile ? '100%' : 440,
        maxHeight: isMobile ? '92vh' : '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(27,42,143,0.2)',
        border: `1px solid ${S.border}`,
        animation: isMobile ? 'slideUp 0.3s ease' : 'slideUp 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: `1px solid ${S.border}`,
          background: `linear-gradient(135deg, ${S.blue}, ${S.blueLt})`,
          position: 'sticky', top: 0, zIndex: 10,
          borderRadius: isMobile ? '20px 20px 0 0' : '20px 20px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8, display: 'flex' }}>
              <RefreshCw size={18} color="#fff" />
            </div>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0 }}>{t('stock.adjustTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          ><X size={16} /></button>
        </div>

        <div style={{ padding: isMobile ? '20px 16px' : 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Pwodui */}
          <div>
            <label style={{ display: 'block', color: S.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t('stock.product')}</label>
            {selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: S.blueDim, border: `1.5px solid ${S.blue}40`, borderRadius: 12 }}>
                <div>
                  <p style={{ color: S.blue, fontWeight: 700, fontSize: 14, margin: 0 }}>{selected.name}</p>
                  <p style={{ color: S.muted, fontSize: 11, fontFamily: 'monospace', margin: '3px 0 0' }}>{t('stock.currentStock')}: {Number(selected.quantity)}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: `${S.blue}20`, border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: S.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: S.muted }} />
                  <input
                    placeholder={t('stock.searchProduct')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: 36, padding: '11px 14px 11px 36px', borderRadius: 10, border: `1.5px solid ${S.border}`, outline: 'none', fontSize: 14, color: S.text, background: '#F8F9FF', boxSizing: 'border-box' }}
                  />
                </div>
                {products?.map(p => (
                  <button key={p.id} type="button" onClick={() => { setSelected(p); setSearch('') }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 10, cursor: 'pointer', marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: S.muted, fontFamily: 'monospace' }}>{Number(p.quantity)} {p.unit}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Tip */}
          <div>
            <label style={{ display: 'block', color: S.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t('stock.movementType')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TYPES.map(opt => (
                <button key={opt.v} type="button" onClick={() => setForm({ ...form, type: opt.v })} style={{
                  padding: '11px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: form.type === opt.v ? opt.color : '#F8F9FF',
                  color: form.type === opt.v ? '#fff' : S.muted,
                  border: `1.5px solid ${form.type === opt.v ? opt.color : S.border}`,
                  boxShadow: form.type === opt.v ? `0 4px 12px ${opt.color}40` : 'none',
                }}>
                  <span style={{ fontSize: 16 }}>{opt.icon}</span>{t(opt.lKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Kantite */}
          <div>
            <label style={{ display: 'block', color: S.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t('stock.quantity')}</label>
            <input
              type="number" step="0.001" min="0.001" placeholder="0"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${S.border}`, outline: 'none', fontSize: 18, fontWeight: 800, color: S.text, background: '#F8F9FF', boxSizing: 'border-box', fontFamily: 'monospace' }}
            />
          </div>

          {/* Nòt */}
          <div>
            <label style={{ display: 'block', color: S.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {t('stock.notes')} <span style={{ color: S.muted, fontWeight: 400 }}>({t('common.optional')})</span>
            </label>
            <input
              placeholder={t('stock.notesPlaceholder')}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${S.border}`, outline: 'none', fontSize: 13, color: S.text, background: '#F8F9FF', boxSizing: 'border-box' }}
            />
          </div>

          {/* Bouton yo */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: `1px solid ${S.border}` }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#F4F6FF', border: `1px solid ${S.border}`, color: S.muted, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {t('common.cancel')}
            </button>
            <button onClick={handleConfirm} disabled={mutation.isLoading} style={{
              flex: 2, padding: '12px', borderRadius: 10,
              background: mutation.isLoading ? `${S.orange}80` : `linear-gradient(135deg, ${S.orange}, ${S.orangeLt})`,
              border: 'none', color: '#fff', fontWeight: 800,
              cursor: mutation.isLoading ? 'not-allowed' : 'pointer',
              fontSize: 14, boxShadow: `0 4px 16px ${S.orange}50`,
            }}>
              {mutation.isLoading ? '...' : t('stock.confirmAdjust')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Kat mouvman pou mobile
function MovementCard({ m, t }) {
  const mvStyle = MOVEMENT_STYLES[m.movementType] || MOVEMENT_STYLES.adjustment
  const change  = Number(m.quantityChange)
  return (
    <div style={{
      background: S.card, borderRadius: 14, border: `1px solid ${S.border}`,
      padding: '14px 16px', boxShadow: '0 2px 8px rgba(27,42,143,0.06)',
    }}>
      {/* Tèt kat */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${S.blue}15,${S.blue}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={16} color={S.blue} />
          </div>
          <div>
            <p style={{ color: S.text, fontWeight: 700, fontSize: 14, margin: 0 }}>{m.product?.name}</p>
            <p style={{ color: S.muted, fontSize: 11, fontFamily: 'monospace', margin: '2px 0 0' }}>{m.product?.code || '—'}</p>
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: mvStyle.bg, color: mvStyle.color }}>
          {mvStyle.icon} {t(MOVEMENT_KEYS[m.movementType] || 'stock.adjustment')}
        </span>
      </div>

      {/* Chif yo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '10px 12px', background: S.bg, borderRadius: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: S.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '0.05em' }}>{t('stock.colBefore')}</p>
          <p style={{ color: S.text, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, margin: 0 }}>{Number(m.quantityBefore)}</p>
        </div>
        <div style={{ textAlign: 'center', borderLeft: `1px solid ${S.border}`, borderRight: `1px solid ${S.border}` }}>
          <p style={{ color: S.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '0.05em' }}>{t('stock.colChange')}</p>
          <p style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, margin: 0, color: change > 0 ? S.success : S.danger }}>
            {change > 0 ? '+' : ''}{change}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: S.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '0.05em' }}>{t('stock.colAfter')}</p>
          <p style={{ color: S.text, fontFamily: 'monospace', fontSize: 14, fontWeight: 800, margin: 0 }}>{Number(m.quantityAfter)}</p>
        </div>
      </div>

      {/* Pye kat */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ color: S.muted, fontSize: 12 }}>👤 {m.creator?.fullName || '—'}</span>
        <span style={{ color: S.muted, fontSize: 11, fontFamily: 'monospace' }}>
          {format(new Date(m.createdAt), 'dd/MM/yy HH:mm')}
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// KONPOZAN PRENSIPAL
// ══════════════════════════════════════════════
export default function StockPage() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [showAdjust, setShowAdjust] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', typeFilter, page],
    queryFn: () => stockAPI.getMovements({ type: typeFilter, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const FILTER_OPTIONS = [
    { v: '',            lKey: 'stock.allTypes' },
    { v: 'sale',        lKey: 'stock.sale' },
    { v: 'purchase',    lKey: 'stock.purchase' },
    { v: 'adjustment',  lKey: 'stock.adjustment' },
    { v: 'return_item', lKey: 'stock.return' },
    { v: 'loss',        lKey: 'stock.loss' },
    { v: 'transfer',    lKey: 'stock.transfer' },
  ]

  const COL_HEADERS = [
    t('stock.colProduct'), t('stock.colType'), t('stock.colBefore'),
    t('stock.colChange'), t('stock.colAfter'), t('stock.colBy'), t('stock.colDate')
  ]

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: 14, background: `linear-gradient(135deg, ${S.blue}, ${S.blueLt})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${S.blue}40`, flexShrink: 0 }}>
            <Warehouse size={isMobile ? 19 : 22} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: S.text, fontSize: isMobile ? 18 : 22, fontWeight: 900, margin: 0 }}>{t('stock.title')}</h1>
            <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>
              {data?.total || 0} {t('stock.movements')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdjust(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: 12,
            background: `linear-gradient(135deg, ${S.orange}, ${S.orangeLt})`,
            border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer',
            fontSize: isMobile ? 13 : 14,
            boxShadow: `0 4px 16px ${S.orange}45`,
          }}
        >
          <Plus size={16} /> {t('stock.adjustBtn')}
        </button>
      </div>

      {/* Filtè — scroll horizontal sou mobile */}
      <div style={{
        background: S.card, borderRadius: 14, padding: '12px 14px',
        border: `1px solid ${S.border}`, marginBottom: 16,
        boxShadow: '0 2px 8px rgba(27,42,143,0.06)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          paddingBottom: 2,
          // kache scrollbar
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          <span style={{ color: S.muted, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{t('stock.filter')}:</span>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.v}
              onClick={() => { setTypeFilter(opt.v); setPage(1) }}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                background: typeFilter === opt.v ? S.blue : '#F4F6FF',
                color: typeFilter === opt.v ? '#fff' : S.muted,
                border: `1.5px solid ${typeFilter === opt.v ? S.blue : S.border}`,
                boxShadow: typeFilter === opt.v ? `0 3px 10px ${S.blue}35` : 'none',
              }}
            >
              {t(opt.lKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ── MOBILE: Lis kat ── */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading
            ? Array(4).fill(0).map((_, i) => (
              <div key={i} style={{ background: S.card, borderRadius: 14, border: `1px solid ${S.border}`, padding: '14px 16px', height: 120 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array(3).fill(0).map((_, j) => (
                    <div key={j} style={{ height: 14, background: '#F0F2FF', borderRadius: 6, animation: 'pulse 1.5s infinite', width: j === 0 ? '60%' : j === 1 ? '40%' : '80%' }} />
                  ))}
                </div>
              </div>
            ))
            : !data?.movements?.length
              ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', background: S.card, borderRadius: 16, border: `1px solid ${S.border}` }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 18, background: S.blueDim, marginBottom: 14 }}>
                    <Warehouse size={28} color={S.blue} />
                  </div>
                  <p style={{ color: S.muted, fontSize: 15, fontWeight: 600, margin: 0 }}>{t('stock.noMovements')}</p>
                  <p style={{ color: `${S.muted}80`, fontSize: 13, margin: '6px 0 0' }}>{t('stock.clickToStart')}</p>
                </div>
              )
              : data.movements.map(m => <MovementCard key={m.id} m={m} t={t} />)
          }
        </div>
      ) : (
        /* ── DESKTOP: Tab ── */
        <div style={{ background: S.card, borderRadius: 16, border: `1px solid ${S.border}`, boxShadow: '0 4px 20px rgba(27,42,143,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 90px 80px 1fr 100px', padding: '12px 20px', background: `linear-gradient(135deg, ${S.blue}08, ${S.blueDim})`, borderBottom: `1px solid ${S.border}` }}>
            {COL_HEADERS.map(h => (
              <span key={h} style={{ color: S.blue, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          {isLoading
            ? Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'grid', gridTemplateColumns: '2fr 1fr 80px 90px 80px 1fr 100px', gap: 8, alignItems: 'center' }}>
                {Array(7).fill(0).map((_, j) => <div key={j} style={{ height: 14, background: '#F0F2FF', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ))
            : !data?.movements?.length
              ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 20, background: S.blueDim, marginBottom: 16 }}>
                    <Warehouse size={32} color={S.blue} />
                  </div>
                  <p style={{ color: S.muted, fontSize: 15, fontWeight: 600, margin: 0 }}>{t('stock.noMovements')}</p>
                  <p style={{ color: `${S.muted}80`, fontSize: 13, margin: '6px 0 0' }}>{t('stock.clickToStart')}</p>
                </div>
              )
              : data.movements.map((m, idx) => {
                const mvStyle = MOVEMENT_STYLES[m.movementType] || MOVEMENT_STYLES.adjustment
                const change  = Number(m.quantityChange)
                return (
                  <div key={m.id}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 90px 80px 1fr 100px', padding: '13px 20px', alignItems: 'center', borderBottom: idx < data.movements.length - 1 ? `1px solid ${S.border}` : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = S.blueDim}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${S.blue}15,${S.blue}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={15} color={S.blue} />
                      </div>
                      <div>
                        <p style={{ color: S.text, fontWeight: 700, fontSize: 13, margin: 0 }}>{m.product?.name}</p>
                        <p style={{ color: S.muted, fontSize: 11, fontFamily: 'monospace', margin: '2px 0 0' }}>{m.product?.code || '—'}</p>
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: mvStyle.bg, color: mvStyle.color, width: 'fit-content' }}>
                      <span>{mvStyle.icon}</span>
                      {t(MOVEMENT_KEYS[m.movementType] || 'stock.adjustment')}
                    </span>
                    <span style={{ color: S.muted, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{Number(m.quantityBefore)}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: change > 0 ? S.success : S.danger, background: change > 0 ? S.successBg : S.dangerBg, padding: '3px 10px', borderRadius: 8, width: 'fit-content' }}>
                      {change > 0 ? '+' : ''}{change}
                    </span>
                    <span style={{ color: S.text, fontFamily: 'monospace', fontSize: 13, fontWeight: 800 }}>{Number(m.quantityAfter)}</span>
                    <span style={{ color: S.muted, fontSize: 12 }}>{m.creator?.fullName || '—'}</span>
                    <span style={{ color: S.muted, fontSize: 11, fontFamily: 'monospace' }}>{format(new Date(m.createdAt), 'dd/MM/yy HH:mm')}</span>
                  </div>
                )
              })
          }
        </div>
      )}

      {/* Pagination */}
      {data?.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
          <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>
            {t('stock.page')} <strong style={{ color: S.text }}>{page}</strong> / {data.pages}
            {' · '}<strong style={{ color: S.text }}>{data.total}</strong> {t('stock.movementsTotal')}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, cursor: page <= 1 ? 'not-allowed' : 'pointer', background: page <= 1 ? '#F4F6FF' : S.blue, border: `1px solid ${page <= 1 ? S.border : S.blue}`, color: page <= 1 ? S.muted : '#fff' }}
            ><ChevronLeft size={16} /></button>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage(p => p + 1)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, cursor: page >= data.pages ? 'not-allowed' : 'pointer', background: page >= data.pages ? '#F4F6FF' : S.blue, border: `1px solid ${page >= data.pages ? S.border : S.blue}`, color: page >= data.pages ? S.muted : '#fff' }}
            ><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showAdjust && <AdjustModal onClose={() => setShowAdjust(false)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}