// ─────────────────────────────────────────────────────────────
// useSabotayMutations.js — Tout mutations Sabotay nan yon sèl hook
// ─────────────────────────────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { apiFetch, SOL_API } from './sabotayUtils'

/**
 * @param {object} opts
 * @param {object|null} opts.activePlan   — plan ki seleksyone kounye a
 * @param {object|null} opts.tenant       — tenant aktyèl
 * @param {object}      opts.printer      — printer state (depi usePrinterState)
 * @param {Function}    opts.onCreateDone — apre kreye plan (r) => void
 * @param {Function}    opts.onEditDone   — apre modifye plan
 * @param {Function}    opts.onAddDone    — apre ajoute manm (saved, credentials) => void
 * @param {Function}    opts.onCloseDone  — apre fèmen plan
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
  // ✅ FIX: pase credentials bay _cb pou ModalMemberCredentials ka montre modpas la
  const addMember = useMutation({
    mutationFn: async (data) => {
      const { _cb, ...body } = data
      const r = await apiFetch(
        `/sabotay/plans/${activePlan?.id}/members`,
        { method: 'POST', body: JSON.stringify(body) }
      )
      const savedMember = r.member || r

      if (body.credentials && savedMember?.id) {
        try {
          const { token } = useAuthStore.getState()
          const solRes = await fetch(`${SOL_API}/api/sol/accounts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              memberId:    savedMember.id,
              tenantId:    tenant?.id,
              dueTime:     activePlan?.dueTime || '08:00',
              credentials: body.credentials,
            }),
          })
          // ✅ FIX: kaptire plainPassword depi repons Sol la
          const solData = await solRes.json().catch(() => ({}))
          if (solData.plainPassword) {
            body.credentials.password = solData.plainPassword
          }
        } catch (err) {
          console.error('[SOL ACCOUNT CREATE]', err)
        }
      }

      return { r, credentials: body.credentials }
    },
    onSuccess: ({ r, credentials }, vars) => {
      qc.invalidateQueries(['sabotay-plans'])
      const saved = r.member || r
      if (saved && activePlan) printer.print(activePlan, saved, [], tenant, 'kont')

      // ✅ FIX: pase credentials ansanm ak manm lan bay callback la
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

  // ─── Aksyon Manm (block/unblock/stop/resume/payout) ───────
  const memberAction = useMutation({
    mutationFn: ({ planId, memberId, action, reason }) =>
      apiFetch(
        `/sabotay/plans/${planId}/members/${memberId}/action`,
        { method: 'POST', body: JSON.stringify({ action, reason }) }
      ),
    onSuccess: (r, vars) => {
      qc.invalidateQueries(['sabotay-plans'])
      const labels = {
        block:   '🔒 Bloke!',
        unblock: '🔓 Debloke!',
        stop:    '⏸️ Kanpe!',
        resume:  '▶️ Reprann!',
        payout:  '🏆 Touche konfime!',
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

  return { createPlan, updatePlan, closePlan, addMember, markPayment, memberAction, blindDraw }
}
