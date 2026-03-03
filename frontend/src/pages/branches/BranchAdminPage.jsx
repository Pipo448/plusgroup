// src/pages/branches/BranchAdminPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  GitBranch, Plus, Power, PowerOff, Users, Package,
  FileText, Edit3, Trash2, X, Lock, Unlock,
  BarChart2, MapPin, Phone, UserPlus, ShieldCheck, Shield
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { branchAPI } from '../../services/api'

const T = {
  ht: {
    title: 'Jesyon Branch',
    subtitle: 'Jere tout biznis ak zòn ou yo nan yon sèl kont',
    createBranch: 'Kreye Branch',
    noBranches: 'Pa gen branch anpil. Kreye premye branch ou a!',
    active: 'Aktif',
    locked: 'Bloke',
    activate: 'Aktive',
    lock: 'Bloke',
    edit: 'Modifye',
    delete: 'Efase',
    users: 'Itilizatè',
    products: 'Pwodui',
    invoices: 'Fakti',
    reports: 'Rapò',
    globalReport: 'Rapò Global',
    name: 'Non Branch',
    description: 'Deskripsyon',
    address: 'Adrès',
    phone: 'Telefòn',
    email: 'Email',
    save: 'Anrejistre',
    cancel: 'Anile',
    confirmDelete: 'Ou sèten vle efase branch sa a?',
    deleteWarning: 'Done branch la ap gade, sèlman lyen an ap retire.',
    limitReached: 'Ou rive nan limit branch plan ou a. Modifye plan pou ajoute plis.',
    branchLocked: 'Branch sa a bloke. Kontakte administratè pou debloke.',
    manageBranchUsers: 'Jere Itilizatè Branch',
    addUser: 'Ajoute Itilizatè',
    removeUser: 'Retire',
    close: 'Fèmen',
    role: 'Wòl',
    isAdmin: 'Admin Branch',
    viewReport: 'Wè Rapò',
    selectUser: 'Chwazi yon itilizatè...',
    noUsers: 'Pa gen itilizatè nan branch sa a.',
    confirmRemove: 'Retire itilizatè sa a nan branch lan?',
    superAdminOnly: 'Sèlman Super Admin ka bloke/debloke',
  },
  fr: {
    title: 'Gestion des Branches',
    subtitle: 'Gérez toutes vos entreprises et zones en un seul compte',
    createBranch: 'Créer une Branch',
    noBranches: 'Aucune branch. Créez votre première branch!',
    active: 'Active',
    locked: 'Bloquée',
    activate: 'Activer',
    lock: 'Bloquer',
    edit: 'Modifier',
    delete: 'Supprimer',
    users: 'Utilisateurs',
    products: 'Produits',
    invoices: 'Factures',
    reports: 'Rapports',
    globalReport: 'Rapport Global',
    name: 'Nom de la Branch',
    description: 'Description',
    address: 'Adresse',
    phone: 'Téléphone',
    email: 'Email',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirmDelete: 'Confirmer la suppression de cette branch?',
    deleteWarning: 'Les données sont conservées, seul le lien est supprimé.',
    limitReached: 'Limite atteinte. Changez de plan pour ajouter plus.',
    branchLocked: "Branch bloquée. Contactez l'admin pour débloquer.",
    manageBranchUsers: 'Gérer les Utilisateurs',
    addUser: 'Ajouter',
    removeUser: 'Retirer',
    close: 'Fermer',
    role: 'Rôle',
    isAdmin: 'Admin Branch',
    viewReport: 'Voir Rapport',
    selectUser: 'Choisir un utilisateur...',
    noUsers: "Aucun utilisateur dans cette branch.",
    confirmRemove: 'Retirer cet utilisateur de la branch?',
    superAdminOnly: 'Seul le Super Admin peut bloquer/débloquer',
  },
  en: {
    title: 'Branch Management',
    subtitle: 'Manage all your businesses and zones in one account',
    createBranch: 'Create Branch',
    noBranches: 'No branches yet. Create your first branch!',
    active: 'Active',
    locked: 'Locked',
    activate: 'Activate',
    lock: 'Lock',
    edit: 'Edit',
    delete: 'Delete',
    users: 'Users',
    products: 'Products',
    invoices: 'Invoices',
    reports: 'Reports',
    globalReport: 'Global Report',
    name: 'Branch Name',
    description: 'Description',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    save: 'Save',
    cancel: 'Cancel',
    confirmDelete: 'Confirm deletion of this branch?',
    deleteWarning: 'Data is preserved, only the branch link is removed.',
    limitReached: 'Branch limit reached. Upgrade your plan for more.',
    branchLocked: 'Branch is locked. Contact admin to unlock.',
    manageBranchUsers: 'Manage Branch Users',
    addUser: 'Add User',
    removeUser: 'Remove',
    close: 'Close',
    role: 'Role',
    isAdmin: 'Branch Admin',
    viewReport: 'View Report',
    selectUser: 'Select a user...',
    noUsers: 'No users in this branch.',
    confirmRemove: 'Remove this user from branch?',
    superAdminOnly: 'Only Super Admin can lock/unlock',
  }
}

const COLORS = {
  gold:   '#C9A84C',
  red:    '#8B0000',
  navy:   '#1B3A6B',
  dark:   '#0a0a0f',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(201,168,76,0.2)',
}

// ══════════════════════════════════════════════════════
// MODAL ITILIZATÈ BRANCH
// ══════════════════════════════════════════════════════
const BranchUsersModal = ({ branch, lang, onClose }) => {
  const t = T[lang] || T.ht
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('cashier')
  const [selectedIsAdmin, setSelectedIsAdmin] = useState(false)

  const { data: branchDetail, isLoading } = useQuery({
    queryKey: ['branch-detail', branch.id],
    queryFn: () => branchAPI.getOne(branch.id).then(r => r.data.branch)
  })

  const { data: allUsersData } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => branchAPI.getTenantUsers().then(r => r.data.users)
  })

  const branchUserIds = branchDetail?.branchUsers?.map(bu => bu.userId) || []
  const availableUsers = (allUsersData || []).filter(u => !branchUserIds.includes(u.id))

  const addMutation = useMutation({
    mutationFn: () => branchAPI.addUser(branch.id, {
      userId: selectedUserId, role: selectedRole, isAdmin: selectedIsAdmin
    }),
    onSuccess: () => {
      toast.success('Itilizatè ajoute!')
      qc.invalidateQueries(['branch-detail', branch.id])
      qc.invalidateQueries(['branches'])
      setSelectedUserId(''); setSelectedRole('cashier'); setSelectedIsAdmin(false)
    },
    onError: err => toast.error(err.response?.data?.message || 'Erè ajoute')
  })

  const removeMutation = useMutation({
    mutationFn: (userId) => branchAPI.removeUser(branch.id, userId),
    onSuccess: () => {
      toast.success('Itilizatè retire.')
      qc.invalidateQueries(['branch-detail', branch.id])
      qc.invalidateQueries(['branches'])
    },
    onError: err => toast.error(err.response?.data?.message || 'Erè retire')
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={17} /> {t.manageBranchUsers}: <span style={{ color: '#fff' }}>{branch.name}</span>
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <p style={{ color: COLORS.gold, fontSize: 12, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <UserPlus size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />{t.addUser}
          </p>
          <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: selectedUserId ? '#fff' : '#64748b', marginBottom: 10, boxSizing: 'border-box' }}>
            <option value="" style={{ background: '#0f172a' }}>{t.selectUser}</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id} style={{ background: '#0f172a' }}>{u.fullName} — {u.email}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}>
              <option value="cashier" style={{ background: '#0f172a' }}>Kasye</option>
              <option value="manager" style={{ background: '#0f172a' }}>Manadjè</option>
              <option value="accountant" style={{ background: '#0f172a' }}>Kontab</option>
              <option value="viewer" style={{ background: '#0f172a' }}>Wè sèlman</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={selectedIsAdmin} onChange={e => setSelectedIsAdmin(e.target.checked)} style={{ accentColor: COLORS.gold, width: 14, height: 14 }} />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{t.isAdmin}</span>
            </label>
            <button onClick={() => selectedUserId && addMutation.mutate()} disabled={!selectedUserId || addMutation.isPending}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: selectedUserId ? `linear-gradient(135deg, ${COLORS.gold}, #a07830)` : '#1e293b', color: selectedUserId ? '#000' : '#64748b', fontWeight: 700, fontSize: 12, cursor: selectedUserId ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              {addMutation.isPending ? '...' : '+ ' + t.addUser}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>Chajman...</div>
          ) : !branchDetail?.branchUsers?.length ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 30, fontSize: 13 }}>
              <Users size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />{t.noUsers}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {branchDetail.branchUsers.map(bu => (
                <div key={bu.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)` }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `linear-gradient(135deg, #8B0000, #C0392B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
                    {bu.user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{bu.user.fullName}</span>
                      {bu.isAdmin && (
                        <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 10, background: 'rgba(201,168,76,0.15)', color: COLORS.gold, fontWeight: 700 }}>
                          <ShieldCheck size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />Admin
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{bu.user.email} · <span style={{ textTransform: 'capitalize' }}>{bu.role}</span></div>
                  </div>
                  <button onClick={() => { if (window.confirm(t.confirmRemove)) removeMutation.mutate(bu.userId) }} disabled={removeMutation.isPending}
                    style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(192,57,43,0.15)', color: '#C0392B', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {t.removeUser}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
          <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{t.close}</button>
        </div>
      </div>
    </div>
  )
}

// ── Carte Branch
const BranchCard = ({ branch, lang, onToggle, onEdit, onDelete, onUsers, onReport, isAdmin, isSuperAdmin }) => {
  const t = T[lang] || T.ht
  const color = branch.isActive ? '#27ae60' : '#C0392B'

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${branch.isActive ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: branch.isActive ? 'rgba(39,174,96,0.15)' : 'rgba(192,57,43,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {branch.isActive ? <Unlock size={16} color="#27ae60" /> : <Lock size={16} color="#C0392B" />}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{branch.name}</div>
            <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>/{branch.slug}</div>
          </div>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: branch.isActive ? 'rgba(39,174,96,0.15)' : 'rgba(192,57,43,0.15)', color }}>
          {branch.isActive ? t.active : t.locked}
        </span>
      </div>

      {branch.description && <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{branch.description}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {branch.address && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 11 }}><MapPin size={10} />{branch.address}</span>}
        {branch.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 11 }}><Phone size={10} />{branch.phone}</span>}
      </div>

      {branch._count && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { icon: Users, label: t.users, val: branch._count.branchUsers },
            { icon: Package, label: t.products, val: branch._count.products },
            { icon: FileText, label: t.invoices, val: branch._count.invoices },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
              <Icon size={12} color={COLORS.gold} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{val || 0}</div>
              <div style={{ color: '#64748b', fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
          {isSuperAdmin ? (
            <button onClick={() => onToggle(branch)} style={{ flex: 1, minWidth: 90, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: branch.isActive ? 'rgba(192,57,43,0.15)' : 'rgba(39,174,96,0.15)', color: branch.isActive ? '#C0392B' : '#27ae60', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {branch.isActive ? <><PowerOff size={12}/>{t.lock}</> : <><Power size={12}/>{t.activate}</>}
            </button>
          ) : (
            <div title={t.superAdminOnly} style={{ flex: 1, minWidth: 90, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#334155', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'not-allowed' }}>
              <Lock size={12} />{branch.isActive ? t.lock : t.activate}
            </div>
          )}
          <button onClick={() => onUsers(branch)} style={{ flex: 1, minWidth: 90, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(201,168,76,0.12)', color: COLORS.gold, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Users size={12}/>{t.users}
          </button>
          <button onClick={() => onReport(branch)} style={{ flex: 1, minWidth: 90, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(26,58,107,0.15)', color: '#60a5fa', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <BarChart2 size={12}/>{t.reports}
          </button>
          <button onClick={() => onEdit(branch)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Edit3 size={12}/>{t.edit}
          </button>
          <button onClick={() => onDelete(branch)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(192,57,43,0.1)', color: '#C0392B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={12}/>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Modal Formulè
// ⚠️ KORIJE — retire champ slug, jenere otomatikman nan backend
const BranchModal = ({ branch, lang, onClose, onSave }) => {
  const t = T[lang] || T.ht
  const [form, setForm] = useState({
    name: branch?.name || '',
    description: branch?.description || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    email: branch?.email || '',
  })
  const isEdit = !!branch?.id

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: 0, fontSize: 18 }}>{isEdit ? t.edit : t.createBranch}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'name',        label: t.name        },
            { key: 'description', label: t.description },
            { key: 'address',     label: t.address     },
            { key: 'phone',       label: t.phone       },
            { key: 'email',       label: t.email, type: 'email' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
              <input
                type={type || 'text'} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: '#fff', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>{t.cancel}</button>
          <button onClick={() => onSave(form, branch?.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${COLORS.gold}, #a07830)`, color: '#000', cursor: 'pointer', fontWeight: 700 }}>{t.save}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Rapò Branch
const BranchReportModal = ({ branch, lang, onClose }) => {
  const t = T[lang] || T.ht
  const { data, isLoading } = useQuery({
    queryKey: ['branch-report', branch.id],
    queryFn: () => branchAPI.getReport(branch.id).then(r => r.data.report)
  })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: 0 }}>
            <BarChart2 size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t.reports}: {branch.name}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Chajman...</div>
        ) : data ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Fakti Total', val: data.invoices?.count || 0, color: '#60a5fa' },
              { label: 'Devis Total', val: data.quotes?.count || 0, color: COLORS.gold },
              { label: 'Pwodui', val: data.products?.count || 0, color: '#a78bfa' },
              { label: 'Revni (HTG)', val: `${Number(data.invoices?.totalRevenueHtg || 0).toLocaleString('fr-HT')} G`, color: '#27ae60' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ color, fontWeight: 800, fontSize: 24 }}>{val}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Pa gen done.</div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// KONPOZAN PRENSIPAL
// ══════════════════════════════════════════════════════
export default function BranchAdminPage() {
  const { user, tenant } = useAuthStore()
  const lang = tenant?.defaultLanguage || 'ht'
  const t = T[lang] || T.ht
  const qc = useQueryClient()

  const isAdmin = user?.role === 'admin'
  const isSuperAdmin = user?.isSuperAdmin === true

  const [showModal, setShowModal]       = useState(false)
  const [editBranch, setEditBranch]     = useState(null)
  const [usersBranch, setUsersBranch]   = useState(null)
  const [reportBranch, setReportBranch] = useState(null)

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchAPI.getAll().then(r => r.data)
  })

  const branches = branchesData?.branches || []
  const plan = tenant?.plan

  const saveMutation = useMutation({
    mutationFn: ({ form, id }) => {
      // ⚠️ KORIJE — jenere slug otomatikman si pa gen youn (kreye sèlman)
      const payload = { ...form }
      if (!id) {
        payload.slug = form.name.toLowerCase().trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/^-+|-+$/g, '')
      }
      return id ? branchAPI.update(id, payload) : branchAPI.create(payload)
    },
    onSuccess: (_, { id }) => {
      toast.success(id ? 'Branch modifye!' : 'Branch kreye!')
      qc.invalidateQueries(['branches'])
      setShowModal(false)
      setEditBranch(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Erè')
  })

  const toggleMutation = useMutation({
    mutationFn: (branch) => branchAPI.toggle(branch.id),
    onSuccess: () => { qc.invalidateQueries(['branches']); toast.success('Statut branch chanje!') },
    onError: err => toast.error(err.response?.data?.message || 'Erè toggle')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => branchAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['branches']); toast.success('Branch efase.') },
    onError: err => toast.error(err.response?.data?.message || 'Erè efase')
  })

  const handleDelete = (branch) => {
    if (window.confirm(`${t.confirmDelete}\n${t.deleteWarning}`)) deleteMutation.mutate(branch.id)
  }

  const maxBranches = plan?.maxBranches || 1
  const canCreate = isAdmin && branches.length < maxBranches

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: COLORS.gold, margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitBranch size={22} />{t.title}
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>{t.subtitle}</p>
          {plan && (
            <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 12 }}>
              Plan: <strong style={{ color: COLORS.gold }}>{plan.name}</strong>
              {' · '}{branches.length}/{maxBranches} branch
              {isSuperAdmin && (
                <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 10, background: 'rgba(201,168,76,0.15)', color: COLORS.gold, fontWeight: 700 }}>
                  <ShieldCheck size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />Super Admin
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => branchAPI.getGlobalReport().then(r => {
              const d = r.data
              alert(`Rapò Global:\nRevni Total: ${d.global?.revenue?.htg?.toLocaleString()} HTG\nFakti: ${d.global?.invoicesCount}\nDevis: ${d.global?.quotesCount}`)
            })} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', color: '#60a5fa', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <BarChart2 size={14} />{t.globalReport}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setEditBranch(null); setShowModal(true) }} disabled={!canCreate} title={!canCreate ? t.limitReached : ''}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed', background: canCreate ? `linear-gradient(135deg, ${COLORS.gold}, #a07830)` : '#1e293b', color: canCreate ? '#000' : '#64748b', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} />{t.createBranch}
            </button>
          )}
        </div>
      </div>

      {isAdmin && !canCreate && (
        <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#C0392B', fontSize: 13 }}>
          🔒 {t.limitReached}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Chajman...</div>
      ) : branches.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60, background: COLORS.card, borderRadius: 12, border: `1px dashed ${COLORS.border}` }}>
          <GitBranch size={40} color="#334155" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>{t.noBranches}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {branches.map(branch => (
            <BranchCard key={branch.id} branch={branch} lang={lang} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}
              onToggle={(b) => toggleMutation.mutate(b)}
              onEdit={(b) => { setEditBranch(b); setShowModal(true) }}
              onDelete={handleDelete}
              onUsers={(b) => setUsersBranch(b)}
              onReport={(b) => setReportBranch(b)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <BranchModal branch={editBranch} lang={lang} onClose={() => { setShowModal(false); setEditBranch(null) }} onSave={(form, id) => saveMutation.mutate({ form, id })} />
      )}

      {usersBranch && (
        <BranchUsersModal branch={usersBranch} lang={lang} onClose={() => setUsersBranch(null)} />
      )}

      {reportBranch && (
        <BranchReportModal branch={reportBranch} lang={lang} onClose={() => setReportBranch(null)} />
      )}
    </div>
  )
}
