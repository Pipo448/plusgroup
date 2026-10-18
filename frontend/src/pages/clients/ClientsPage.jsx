// src/pages/clients/ClientsPage.jsx — Plus Fit redesign
// ✅ KORIJE:
//   • invalidateQueries ak keepPreviousData te nan fòma v4 → lis la pa t rafrechi apre
//     kreye/modifye/efase, e paj la te « flache » vid chak fwa w chanje paj
//   • Chak lèt ou tape nan rechèch la te voye yon demann bay sèvè a → kounye a li tann
//     ou fin tape (mwens done, bon pou kota Supabase)
//   • Pa t gen mesaj erè si sèvè a refize (egz. efase yon kliyan ki gen fakti)
//   • Paj la te kraze si yon kliyan pa t gen non (c.name.charAt)
//   • Lè w modifye, tout objè kliyan an (id, _count, createdAt…) te voye bay sèvè a
//   • Lajan prefere a pa t gen valè pa defo lè w kreye yon kliyan
//   • Email/telefòn pa t verifye; fòm nan te twò sere sou telefòn (2 kolòn)
//   • Efase te fèt ak yon ti fenèt navigatè (confirm) — kounye a se yon fenèt klè ki di
//     konbyen fakti/devi kliyan an genyen
// ✅ NOUVO:
//   • Bouton Rele / WhatsApp / Email dirèk sou chak kat
//   • Klike sou « X fakti » pou wè fakti kliyan an
//   • Avètisman si yon lòt kliyan gen menm telefòn nan (evite doub)
//   • Filt Moun / Antrepriz, ekspòte CSV, bouton + flotan sou telefòn
import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Plus, Search, Edit2, Trash2, Users, X, Phone, Mail, MapPin, ChevronLeft, ChevronRight, Building2,
  User, Receipt, FileText, MessageCircle, Download, Check, AlertTriangle, Hash, UserPlus,
} from 'lucide-react'
import { clientAPI } from '../../services/api'
import '../invoices/invoices.css'

const tr = (t, k, fb) => { const v = t(k); return v && v !== k ? v : fb }
const LIMIT = 15
const PALETTE = ['#1B2A8F', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0284C7', '#DB2777', '#0F766E', '#B45309', '#4F46E5']
const colorOf = (s = '') => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length] }
const initials = (name) => { const p = String(name || '?').trim().split(/\s+/).filter(Boolean); return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() }
const digits = (s) => String(s || '').replace(/\D/g, '')
// Nimewo Ayiti 8 chif → 509XXXXXXXX pou WhatsApp
const waNumber = (phone) => { const d = digits(phone); if (d.length === 8) return '509' + d; return d.length >= 10 ? d : null }

function useDebounce(v, ms = 350) {
  const [d, setD] = useState(v)
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms])
  return d
}
function useEsc(fn) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && fn?.(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [fn])
}
function useCountUp(value, ms = 600) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => { const p = Math.min(1, (now - start) / ms); setV(a + (b - a) * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); else from.current = b }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}
function Kpi({ label, value, icon: Icon, tone = '', delay = 0 }) {
  const v = useCountUp(value)
  return <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}><div className="l"><Icon size={12}/> {label}</div><div className="v">{Math.round(v)}</div></div>
}

// ════════════════════════════════════════════════════════════
// Fenèt kreye / modifye
// ════════════════════════════════════════════════════════════
function ClientModal({ client, onClose }) {
  const { t } = useTranslation()
  const isEdit = !!client
  const qc = useQueryClient()
  useEsc(onClose)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: client?.name || '', clientType: client?.clientType || 'individual', phone: client?.phone || '', email: client?.email || '',
      address: client?.address || '', nif: client?.nif || '', preferredCurrency: client?.preferredCurrency || 'HTG',
    },
  })
  const type = watch('clientType')
  const phone = watch('phone')
  const dPhone = useDebounce(digits(phone), 500)

  // ✅ Avètisman doub: chèche si yon lòt kliyan gen menm telefòn (sèlman lè nimewo a konplè)
  const { data: dups = [] } = useQuery({
    queryKey: ['client-dup', dPhone],
    queryFn: () => clientAPI.getAll({ search: dPhone.slice(-8), limit: 5 }).then(r => r.data?.clients || []),
    enabled: dPhone.length >= 8,
    staleTime: 60_000,
  })
  const dup = dups.find(c => c.id !== client?.id && digits(c.phone).endsWith(dPhone.slice(-8)))

  const mutation = useMutation({
    mutationFn: (d) => {
      // ✅ Voye SÈLMAN chan fòm nan, pwòp
      const body = {
        name: d.name.trim(), clientType: d.clientType, phone: d.phone.trim() || null, email: d.email.trim().toLowerCase() || null,
        address: d.address.trim() || null, nif: d.nif.trim() || null, preferredCurrency: d.preferredCurrency || 'HTG',
      }
      return isEdit ? clientAPI.update(client.id, body) : clientAPI.create(body)
    },
    onSuccess: () => {
      toast.success(isEdit ? tr(t, 'clients.updated', 'Kliyan modifye') : tr(t, 'clients.created', 'Kliyan kreye'))
      qc.invalidateQueries({ queryKey: ['clients'] })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'common.error', 'Gen yon erè')),
  })

  const bad = (k) => (errors[k] ? { borderColor: 'var(--bad)' } : undefined)

  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 560 }}>
        <div className="iv-sheet-h" style={{ background: 'radial-gradient(120% 140% at 100% 0%, #10B981, #0F1A5C 72%)' }}>
          <h3>{isEdit ? <><Edit2 size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'clients.editClient', 'Modifye kliyan')}</> : <><UserPlus size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'clients.newClient', 'Nouvo kliyan')}</>}</h3>
          <p>{isEdit ? client.name : 'Ajoute yon kliyan pou w ka fè fakti ak devi pou li'}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <form className="iv-sheet-b" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="cl-type">
            {[['individual', User, tr(t, 'clients.individual', 'Moun'), 'Yon kliyan patikilye'], ['company', Building2, tr(t, 'clients.company', 'Antrepriz'), 'Biznis, enstitisyon']].map(([v, I, l, s]) => (
              <button type="button" key={v} className={type === v ? 'on' : ''} onClick={() => setValue('clientType', v, { shouldDirty: true })}>
                <span className="i"><I size={16}/></span><span><b>{l}</b><small>{s}</small></span>
              </button>
            ))}
          </div>
          <input type="hidden" {...register('clientType')}/>

          <div>
            <label className="iv-lbl">{type === 'company' ? 'Non antrepriz' : tr(t, 'clients.name', 'Non konplè')} *</label>
            <input className="iv-inp" autoFocus={!isEdit} placeholder={type === 'company' ? 'Hermano Distribution' : tr(t, 'clients.namePlaceholder', 'Jean Baptiste')} style={bad('name')}
              {...register('name', { required: true, validate: v => v.trim().length >= 2 })}/>
            {errors.name && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>Antre non an (2 karaktè minimòm)</small>}
          </div>

          <div className="cl-2">
            <div>
              <label className="iv-lbl">{tr(t, 'clients.phone', 'Telefòn')}</label>
              <div className="iv-icon-inp"><Phone size={15}/><input className="iv-inp" inputMode="tel" placeholder="+509 3000-0000" style={bad('phone')}
                {...register('phone', { validate: v => !v.trim() || digits(v).length >= 8 })}/></div>
              {errors.phone && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>Nimewo a twò kout</small>}
            </div>
            <div>
              <label className="iv-lbl">{tr(t, 'clients.email', 'Email')}</label>
              <div className="iv-icon-inp"><Mail size={15}/><input type="email" className="iv-inp" placeholder="email@ex.com" style={bad('email')}
                {...register('email', { pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}/></div>
              {errors.email && <small style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 700 }}>Email la pa valid</small>}
            </div>
          </div>
          {dup && (
            <div className="cl-dup" style={{ marginTop: -6 }}><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>Kliyan <b>{dup.name}</b> gen menm nimewo sa a deja{dup.phone ? ` (${dup.phone})` : ''}. Verifye ou pa kreye l 2 fwa.</span>
            </div>
          )}

          <div>
            <label className="iv-lbl">{tr(t, 'clients.address', 'Adrès')}</label>
            <div className="iv-icon-inp"><MapPin size={15}/><input className="iv-inp" placeholder={tr(t, 'clients.addressPlaceholder', 'Ouanaminthe, Ayiti')} {...register('address')}/></div>
          </div>

          <div className="cl-2">
            <div>
              <label className="iv-lbl">{tr(t, 'clients.nif', 'NIF')}</label>
              <div className="iv-icon-inp"><Hash size={15}/><input className="iv-inp mono" placeholder={tr(t, 'clients.nifPlaceholder', '000-000-000-0')} {...register('nif')}/></div>
            </div>
            <div>
              <label className="iv-lbl">{tr(t, 'clients.preferredCurrency', 'Lajan prefere')}</label>
              <select className="iv-inp" {...register('preferredCurrency')}>
                <option value="HTG">🇭🇹 HTG — {tr(t, 'quotes.gourde', 'Goud')}</option>
                <option value="USD">🇺🇸 USD — {tr(t, 'quotes.dollar', 'Dola')}</option>
              </select>
            </div>
          </div>

          <div className="iv-sheet-f">
            <button type="button" className="iv-act" onClick={onClose}>{tr(t, 'common.cancel', 'Anile')}</button>
            <button type="submit" className="iv-btn-main" disabled={mutation.isPending}>
              {mutation.isPending ? <span className="spin" style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}/> : <Check size={16}/>}
              {mutation.isPending ? tr(t, 'common.saving', 'Ap sove…') : isEdit ? tr(t, 'common.update', 'Mete ajou') : tr(t, 'clients.createBtn', 'Kreye kliyan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Konfimasyon efase
// ════════════════════════════════════════════════════════════
function DeleteModal({ client, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  useEsc(onClose)
  const inv = Number(client._count?.invoices || 0), quo = Number(client._count?.quotes || 0)
  const mutation = useMutation({
    mutationFn: () => clientAPI.remove(client.id),
    onSuccess: () => { toast.success(tr(t, 'clients.deleted', 'Kliyan efase')); qc.invalidateQueries({ queryKey: ['clients'] }); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Pa ka efase kliyan sa a'),
  })
  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 420 }}>
        <div className="iv-sheet-h" style={{ background: 'radial-gradient(120% 140% at 100% 0%, #DC2626, #0F1A5C 75%)' }}>
          <h3><Trash2 size={18} style={{ verticalAlign: '-2px' }}/> Efase kliyan</h3>
          <p>{client.name}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <div className="iv-sheet-b">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{tr(t, 'clients.deleteConfirm', 'Ou sèten ou vle efase kliyan sa a?')} Aksyon sa a pa ka defèt.</p>
          {(inv > 0 || quo > 0) && (
            <div className="cl-dup" style={{ marginTop: 0 }}><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>Kliyan sa a gen <b>{inv} fakti</b> ak <b>{quo} devi</b>. Sistèm nan ka refize efase l pou pwoteje istorik vant yo.</span>
            </div>
          )}
          <div className="iv-sheet-f">
            <button className="iv-act" onClick={onClose}>{tr(t, 'common.cancel', 'Anile')}</button>
            <button className="iv-btn-main" style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)', boxShadow: '0 10px 22px rgba(220,38,38,.35)' }} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              <Trash2 size={15}/> {mutation.isPending ? 'Ap efase…' : 'Wi, efase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function ClientsPage() {
  const { t } = useTranslation()
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [typeF, setTypeF] = useState('')
  const [exporting, setExporting] = useState(false)
  const q = useDebounce(search.trim(), 350)
  useEffect(() => setPage(1), [q])

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['clients', q, page],
    queryFn: () => clientAPI.getAll({ search: q, page, limit: LIMIT }).then(r => r.data),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })
  const clients = data?.clients || []
  const total = Number(data?.total || 0)
  const pages = Number(data?.pages || 1)
  const list = useMemo(() => clients.filter(c => !typeF || (c.clientType || 'individual') === typeF), [clients, typeF])
  const pageStats = useMemo(() => ({
    company: clients.filter(c => c.clientType === 'company').length,
    withInv: clients.filter(c => Number(c._count?.invoices || 0) > 0).length,
  }), [clients])

  // Ekspòte TOUT kliyan yo (yon sèl demann, sèlman lè w klike)
  const exportCSV = async () => {
    setExporting(true)
    try {
      const r = await clientAPI.getAll({ search: q, page: 1, limit: 2000 })
      const rows = r.data?.clients || []
      const esc = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
      const csv = '﻿' + [['Non', 'Tip', 'Telefòn', 'Email', 'Adrès', 'NIF', 'Lajan', 'Fakti', 'Devi'],
        ...rows.map(c => [c.name, c.clientType === 'company' ? 'Antrepriz' : 'Moun', c.phone, c.email, c.address, c.nif, c.preferredCurrency, c._count?.invoices || 0, c._count?.quotes || 0])]
        .map(r => r.map(esc).join(';')).join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a'); a.href = url; a.download = `kliyan_${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(`${rows.length} kliyan ekspòte`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ekspòtasyon an echwe')
    } finally { setExporting(false) }
  }

  return (
    <div className="iv" style={{ maxWidth: 1240, margin: '0 auto' }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: 'radial-gradient(circle, rgba(16,185,129,.4), transparent 65%)' }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico emerald"><Users size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">Kontak & relasyon</p>
            <h1>{tr(t, 'nav.clients', 'Kliyan')}</h1>
            <p className="sub">Tout kliyan ou yo, ak yon klik pou rele, ekri sou WhatsApp oswa wè fakti yo.</p>
          </div>
          <button className="iv-btn-main hx cl-hide-m" onClick={() => setModal({ type: 'create' })}><UserPlus size={16}/> {tr(t, 'clients.newClient', 'Nouvo kliyan')}</button>
        </div>
        <div className="iv-kpis">
          <Kpi label={q ? 'Rezilta' : 'Total'} value={total} icon={Users} delay={80}/>
          <Kpi label="Antrepriz" value={pageStats.company} icon={Building2} tone="gold" delay={160}/>
          <Kpi label="Ak fakti" value={pageStats.withInv} icon={Receipt} tone="green" delay={240}/>
        </div>
      </section>

      <div className="iv-bar">
        <div className="iv-search">
          <Search size={16}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr(t, 'clients.searchPlaceholder', 'Chèche non, telefòn, email…')}/>
          {search && <button onClick={() => setSearch('')} aria-label="Efase" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'grid' }}><X size={15}/></button>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, flex: '0 1 auto' }}>
        <div className="iv-chips cl-chips" style={{ flex: '1 1 auto', minWidth: 0 }}>
          {[['', 'Tout', null], ['individual', tr(t, 'clients.individual', 'Moun'), '#0284C7'], ['company', tr(t, 'clients.company', 'Antrepriz'), '#D97706']].map(([k, l, c]) => (
            <button key={k} className={`iv-chip ${typeF === k ? 'on' : ''}`} onClick={() => setTypeF(k)}>{c && <span className="dot" style={{ background: c }}/>}{l}</button>
          ))}
        </div>
        <button className="iv-act green cl-csv" onClick={exportCSV} title="Ekspòte CSV" disabled={exporting || !total}>
          {exporting ? <span className="spin" style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}/> : <Download size={15}/>} <span className="lbx">CSV</span>
        </button>
        </div>
      </div>

      {isError ? (
        <div className="iv-empty"><h3>Pa ka chaje kliyan yo</h3><p>Verifye koneksyon entènèt ou.</p><button className="iv-act" onClick={() => refetch()}>Eseye ankò</button></div>
      ) : isLoading ? (
        <div className="cl-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="cl-card" style={{ '--ac': '#E2E8F0' }}>
              <div className="cl-top"><div className="iv-sk" style={{ width: 48, height: 48, borderRadius: 15 }}/><div style={{ flex: 1 }}><div className="iv-sk" style={{ width: '60%', marginBottom: 8 }}/><div className="iv-sk" style={{ width: '30%' }}/></div></div>
              <div className="iv-sk" style={{ width: '70%' }}/><div className="iv-sk" style={{ width: '50%' }}/>
            </div>
          ))}
        </div>
      ) : !list.length ? (
        <div className="iv-empty">
          <div className="art"><div className="paper"><i/><i/><i/><i/></div><div className="bubble"><Users size={18}/></div></div>
          <h3>{q || typeF ? 'Okenn rezilta' : tr(t, 'clients.noClients', 'Poko gen kliyan')}</h3>
          <p>{q || typeF ? 'Chanje rechèch la oswa filt la.' : 'Ajoute premye kliyan ou pou kòmanse.'}</p>
          {q || typeF
            ? <button className="iv-act" onClick={() => { setSearch(''); setTypeF('') }}>Efase filt yo</button>
            : <button className="iv-btn-main" onClick={() => setModal({ type: 'create' })}><UserPlus size={16}/> {tr(t, 'clients.newClient', 'Nouvo kliyan')}</button>}
        </div>
      ) : (
        <div className="cl-grid" style={{ opacity: isFetching && !isLoading ? .65 : 1, transition: 'opacity .2s' }}>
          {list.map((c, i) => {
            const ac = colorOf(c.name || c.id)
            const isCo = c.clientType === 'company'
            const inv = Number(c._count?.invoices || 0), quo = Number(c._count?.quotes || 0)
            const wa = waNumber(c.phone)
            return (
              <article key={c.id} className="cl-card" style={{ '--ac': ac, animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <div className="cl-top">
                  <div className="cl-av" style={{ background: `linear-gradient(135deg, ${ac}, ${ac}bb)` }}>{isCo ? <Building2 size={20}/> : initials(c.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cl-name">{c.name || '—'}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span className="iv-badge" style={{ background: isCo ? 'rgba(217,119,6,.12)' : 'rgba(2,132,199,.1)', color: isCo ? '#B45309' : '#0369A1' }}>
                        {isCo ? <Building2 size={10}/> : <User size={10}/>} {isCo ? tr(t, 'clients.company', 'Antrepriz') : tr(t, 'clients.individual', 'Moun')}
                      </span>
                      {c.preferredCurrency === 'USD' && <span className="iv-badge" style={{ background: 'var(--okBg)', color: 'var(--ok)' }}>USD</span>}
                    </div>
                  </div>
                </div>

                <div className="cl-info">
                  {c.phone && <div><Phone size={13}/><span>{c.phone}</span></div>}
                  {c.email && <div><Mail size={13}/><span>{c.email}</span></div>}
                  {c.address && <div><MapPin size={13}/><span>{c.address}</span></div>}
                  {c.nif && <div><Hash size={13}/><span className="mono">NIF {c.nif}</span></div>}
                  {!c.phone && !c.email && !c.address && <div style={{ fontStyle: 'italic' }}>Pa gen enfòmasyon kontak</div>}
                </div>

                <div className="cl-stats">
                  <Link to={`/app/invoices?search=${encodeURIComponent(c.name || '')}`}><Receipt size={12}/> {inv} {tr(t, 'clients.invoices', 'fakti')}</Link>
                  <Link to={`/app/quotes?search=${encodeURIComponent(c.name || '')}`}><FileText size={12}/> {quo} {tr(t, 'clients.quotes', 'devi')}</Link>
                </div>

                <div className="cl-acts">
                  <a className={`call ${c.phone ? '' : 'off'}`} href={c.phone ? `tel:${digits(c.phone).length === 8 ? '+509' : '+'}${digits(c.phone)}` : undefined}><Phone size={14}/> <span className="t">Rele</span></a>
                  <a className={`wa ${wa ? '' : 'off'}`} href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer"><MessageCircle size={14}/> <span className="t">WhatsApp</span></a>
                  {c.email && <a className="ic" href={`mailto:${c.email}`} aria-label="Email" title="Email"><Mail size={14}/></a>}
                  <button className="ic" onClick={() => setModal({ type: 'edit', client: c })} aria-label="Modifye" title="Modifye"><Edit2 size={14}/></button>
                  <button className="ic del" onClick={() => setModal({ type: 'delete', client: c })} aria-label="Efase" title="Efase"><Trash2 size={14}/></button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="iv-pager">
          <p>{tr(t, 'invoices.page', 'Paj')} <b style={{ color: 'var(--ink)' }}>{page}</b> / {pages} · <b style={{ color: 'var(--ink)' }}>{total}</b> kliyan</p>
          <div className="btns">
            <button className="iv-pg" disabled={page <= 1} onClick={() => { setPage(p => p - 1); (document.getElementById('app-scroll') || window).scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="Paj anvan"><ChevronLeft size={17}/></button>
            <button className="iv-pg" disabled={page >= pages} onClick={() => { setPage(p => p + 1); (document.getElementById('app-scroll') || window).scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="Paj apre"><ChevronRight size={17}/></button>
          </div>
        </div>
      )}

      <button className="cl-fab" onClick={() => setModal({ type: 'create' })} aria-label="Nouvo kliyan"><Plus size={26}/></button>

      {(modal?.type === 'create' || modal?.type === 'edit') && <ClientModal client={modal.type === 'edit' ? modal.client : null} onClose={() => setModal(null)}/>}
      {modal?.type === 'delete' && <DeleteModal client={modal.client} onClose={() => setModal(null)}/>}
    </div>
  )
}