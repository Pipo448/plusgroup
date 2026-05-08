// ─────────────────────────────────────────────────────────────
// useSabotayMutations.js — Tout mutations Sabotay nan yon sèl hook
// (VERSION AK POZISYON DINAMIK)
// ─────────────────────────────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { apiFetch, SOL_API } from './sabotayUtils'

/**
 * @param {object} opts
 * @param {object|null} opts.activePlan
 * @param {object|null} opts.tenant
 * @param {object}      opts.printer
 * @param {Function}    opts.onCreateDone
 * @param {Function}    opts.onEditDone
 * @param {Function}    opts.onAddDone
 * @param {Function}    opts.onCloseDone
 */
export function useSabotayMutations({
  activePlan,
  tenant,
  printer,
  onCreateDone,
  onEditDone,
  onAddDone,
  onCloseDone,
}) {
  const qc = useQueryClient()

  // ─── Kreye Plan ───────────────────────────────────────────
  const createPlan = useMutation({
    mutationFn: (data) =>
      apiFetch('/sabotay/plans', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (r) => {
      qc.invalidateQueries(['sabotay-plans'])
      toast.success('✅ Plan kreye!')
      onCreateDone?.(r.plan || r)
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Modifye Plan ─────────────────────────────────────────
  const updatePlan = useMutation({
    mutationFn: ({ id, ...data }) =>
      apiFetch(`/sabotay/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries(['sabotay-plans'])
      toast.success('✅ Plan modifye!')
      onEditDone?.()
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Fèmen Plan ───────────────────────────────────────────
  const closePlan = useMutation({
    mutationFn: (id) =>
      apiFetch(`/sabotay/plans/${id}/close`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries(['sabotay-plans'])
      toast.success('✅ Plan fèmen!')
      onCloseDone?.()
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Ajoute Manm ──────────────────────────────────────────
  const addMember = useMutation({
    mutationFn: async (data) => {
      const { _cb, ...body } = data
      const r = await apiFetch(
        `/sabotay/plans/${activePlan?.id}/members`,
        { method: 'POST', body: JSON.stringify(body) }
      )

      // ✅ FIX: Jwenn savedMember kòmsadwa
      const savedMember = r?.member || r?.data || r
      const memberId = savedMember?.id || savedMember?.memberId

      let finalPassword = body.credentials?.password

      if (body.credentials && memberId) {
        try {
          const { token } = useAuthStore.getState()
          const solRes = await fetch(`${SOL_API}/api/sol/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              memberId:    memberId,
              tenantId:    tenant?.id,
              dueTime:     activePlan?.dueTime || '08:00',
              credentials: body.credentials,
            }),
          })
          const solData = await solRes.json().catch(() => ({}))
          // ✅ FIX: Sove modpas backend retounen an
          if (solData.plainPassword) {
            finalPassword = solData.plainPassword
          }
        } catch (err) {
          console.error('[SOL ACCOUNT CREATE]', err)
        }
      }

      // ✅ FIX: Retounen modpas final la (pa modpas original la)
      return {
        r,
        credentials: body.credentials
          ? { ...body.credentials, password: finalPassword }
          : null,
      }
    },
    onSuccess: ({ r, credentials }, vars) => {
      qc.invalidateQueries(['sabotay-plans'])
      const saved = r?.member || r?.data || r
      if (saved && activePlan) printer.print(activePlan, saved, [], tenant, 'kont')
      if (typeof vars._cb === 'function') vars._cb(saved, credentials)
      else onAddDone?.(saved, credentials)
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Mache Peman ──────────────────────────────────────────
  const markPayment = useMutation({
    mutationFn: ({ memberId, ...data }) =>
      apiFetch(
        `/sabotay/plans/${activePlan?.id}/members/${memberId}/pay`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    onSuccess: () => {
      qc.invalidateQueries(['sabotay-plans'])
      toast.success('✅ Peman anrejistre!')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Aksyon Manm ──────────────────────────────────────────
  const memberAction = useMutation({
    mutationFn: ({ planId, memberId, action, reason }) =>
      apiFetch(
        `/sabotay/plans/${planId}/members/${memberId}/action`,
        { method: 'POST', body: JSON.stringify({ action, reason }) }
      ),
    onSuccess: (r, vars) => {
      qc.invalidateQueries(['sabotay-plans'])
      const labels = {
        block: '🔒 Bloke!', unblock: '🔓 Debloke!',
        stop: '⏸️ Kanpe!', resume: '▶️ Reprann!', payout: '🏆 Touche konfime!',
      }
      toast.success(labels[vars.action] || '✅ Fèt!')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Tiraj Avèg ───────────────────────────────────────────
  const blindDraw = useMutation({
    mutationFn: (memberId) =>
      apiFetch(
        `/sabotay/plans/${activePlan?.id}/blind-draw`,
        { method: 'POST', body: JSON.stringify({ memberId }) }
      ),
    onSuccess: (r) => {
      qc.invalidateQueries(['sabotay-plans'])
      toast.success(`🏆 ${r.member?.name || 'Manm'} chwazi pa tiraj!`)
      if (activePlan) printer.print(activePlan, r.member || {}, [], tenant, 'tirage')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Toggle Pozisyon Dinamik ──────────────────────────────
  const toggleDynamic = useMutation({
    mutationFn: (planId) =>
      apiFetch(`/sabotay/plans/${planId}/toggle-dynamic`, { method: 'PATCH' }),
    onSuccess: (r) => {
      qc.invalidateQueries(['sabotay-plans'])
      toast.success(r.message || '✅ Chanjman sove!')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Rekalile Pozisyon Manyèlman ─────────────────────────
  const recalculate = useMutation({
    mutationFn: (planId) =>
      apiFetch(`/sabotay/plans/${planId}/recalculate`, { method: 'POST' }),
    onSuccess: (r) => {
      qc.invalidateQueries(['sabotay-plans'])
      toast.success(`🔄 ${r.recalculated} manm reklase!`)
    },
    onError: (e) => toast.error(e.message),
  })

  const adjustPosition = useMutation({
  mutationFn: ({ planId, memberId, steps }) =>
    apiFetch(`/sabotay/plans/${planId}/members/${memberId}/adjust-position`, {
      method: 'POST', body: JSON.stringify({ steps })
    }),
  onSuccess: (r) => {
    qc.invalidateQueries(['sabotay-plans'])
    toast.success(`✅ Pozisyon ajiste: #${r.oldPosition} → #${r.newPosition}`)
  },
  onError: (e) => toast.error(e.message),
})

  return {
    createPlan, updatePlan, closePlan,
    addMember, markPayment, memberAction, blindDraw,
    toggleDynamic, recalculate,
    adjustPosition,
  }
}