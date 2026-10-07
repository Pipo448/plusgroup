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
      // ⚠️ KORIJE EGRESS — plan nouvo a soti san manm, nou ka jis mete l
      // devan lis lokal la olye refè demann konplè pou TOUT plan yo.
      const newPlan = r?.plan || r
      if (newPlan?.id) {
        qc.setQueryData(['sabotay-plans'], (old) =>
          Array.isArray(old) ? [{ ...newPlan, members: newPlan.members || [] }, ...old] : old
        )
      } else {
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      }
      toast.success('✅ Plan kreye!')
      onCreateDone?.(newPlan)
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Modifye Plan ─────────────────────────────────────────
  const updatePlan = useMutation({
    mutationFn: ({ id, ...data }) =>
      apiFetch(`/sabotay/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (r, vars) => {
      // ⚠️ KORIJE EGRESS — repons lan gen sèlman chan plan an (non chan
      // "members"), donk yon fusion (spread) senp KENBE manm/peman ki
      // deja an memwa yo san touche yo, e ajou chan modifye yo sèlman.
      const updatedPlan = r?.plan || r
      if (updatedPlan?.id) {
        qc.setQueryData(['sabotay-plans'], (old) =>
          Array.isArray(old)
            ? old.map(p => (p.id === vars.id ? { ...p, ...updatedPlan } : p))
            : old
        )
      } else {
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      }
      toast.success('✅ Plan modifye!')
      onEditDone?.()
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Fèmen Plan ───────────────────────────────────────────
  const closePlan = useMutation({
    mutationFn: (id) =>
      apiFetch(`/sabotay/plans/${id}/close`, { method: 'POST' }),
    onSuccess: (r, id) => {
      // ⚠️ KORIJE EGRESS — menm rezon ak updatePlan: fusion senp kenbe
      // manm yo, ajou sèlman status/pendingRefunds.
      const closedPlan = r?.plan || r
      if (closedPlan?.id) {
        qc.setQueryData(['sabotay-plans'], (old) =>
          Array.isArray(old)
            ? old.map(p => (p.id === id ? { ...p, ...closedPlan } : p))
            : old
        )
      } else {
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      }
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
      const saved = r?.member || r?.data || r
      // ⚠️ KORIJE EGRESS — si se yon SÈL pozisyon ki kreye (ka pi souvan an),
      // n ap mete nouvo manm nan dirèkteman nan lis lokal la (san peman,
      // fòma map vid, menm jan tout lòt manm san istwa). Si se PLIZYÈ
      // "men"/pozisyon ki kreye anmenmtan, sèvè a retounen sèlman PREMYE
      // manm — nou pa gen done ase pou rekonstwi lòt yo san danje, donk
      // nou refè demann konplè sèlman nan KA SA A.
      const multiPositions = Array.isArray(saved?.positions) && saved.positions.length > 1
      if (saved?.id && activePlan?.id && !multiPositions) {
        const newMember = {
          ...saved,
          payments: {}, paymentTimings: {},
          _credentials: credentials ? { username: credentials.username, password: credentials.password } : null,
        }
        qc.setQueryData(['sabotay-plans'], (old) =>
          Array.isArray(old)
            ? old.map(p => (p.id === activePlan.id ? { ...p, members: [...(p.members || []), newMember] } : p))
            : old
        )
      } else {
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      }
      if (saved && activePlan) printer.print(activePlan, saved, [], tenant, 'kont')
      if (typeof vars._cb === 'function') vars._cb(saved, credentials)
      else onAddDone?.(saved, credentials)
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Mache Peman ──────────────────────────────────────────
  // ⚠️ KORIJE EGRESS — anvan sa, CHAK fwa yon peman te make,
  // `invalidateQueries(['sabotay-plans'])` te refè demann KONPLÈ pou TOUT
  // plan yo (617KB) — si kesye a antre 5-10 peman youn dèyè lòt, sa te fè
  // 5-10 apèl 617KB kolan (egzakteman sa log Render lan montre). Kounye a
  // nou "patch" done ki deja an memwa yo (cache React Query) ak repons
  // sèvè a deja voye pou nou — ZERO apèl rezo anplis pou chak peman.
  const markPayment = useMutation({
    mutationFn: ({ memberId, ...data }) =>
      apiFetch(
        `/sabotay/plans/${activePlan?.id}/members/${memberId}/pay`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    onSuccess: (r, vars) => {
      const createdPayments = r?.payment?.payments || r?.payments || []
      if (createdPayments.length && activePlan?.id) {
        qc.setQueryData(['sabotay-plans'], (old) => {
          if (!Array.isArray(old)) return old
          return old.map(plan => {
            if (plan.id !== activePlan.id) return plan
            return {
              ...plan,
              members: (plan.members || []).map(m => {
                if (m.id !== vars.memberId) return m
                const payments       = { ...(m.payments || {}) }
                const paymentTimings = { ...(m.paymentTimings || {}) }
                for (const p of createdPayments) {
                  const dk = new Date(p.dueDate).toISOString().split('T')[0]
                  payments[dk]       = true
                  paymentTimings[dk] = p.timing || 'onTime'
                }
                return { ...m, payments, paymentTimings }
              })
            }
          })
        })
      } else {
        // ✅ Filè sekirite — si fòma repons lan pa jan n te tann li,
        // retounen nan ansyen konpòtman an (refè demann lan) pou pa
        // kite done yo dezaktyalize.
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      }
      toast.success('✅ Peman anrejistre!')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Aksyon Manm ──────────────────────────────────────────
  const memberAction = useMutation({
    mutationFn: ({ planId, memberId, action, reason, payoutDate }) =>
      apiFetch(
        `/sabotay/plans/${planId}/members/${memberId}/action`,
        { method: 'POST', body: JSON.stringify({ action, reason, payoutDate }) }
      ),
    onSuccess: (r, vars) => {
      // ⚠️ KORIJE EGRESS — 'block'/'unblock'/'stop'/'resume' ka kaskad sou
      // "men" (sibling) ki gen menm telefòn nan menm plan an, e sèvè a
      // pa retounen done sibling yo — patch lokal ta ka kite yo ak yon
      // status ki pa ajou. Donk SÈLMAN pou aksyon sa yo, nou refè demann
      // lan. Pou lòt aksyon yo (payout, schedule/cancel payout, ranbousman
      // peye) se yon SÈL manm ki afekte — patch lokal san danje.
      const cascadingActions = ['block', 'unblock', 'stop', 'resume']
      if (!cascadingActions.includes(vars.action) && r?.member?.id && activePlan?.id) {
        qc.setQueryData(['sabotay-plans'], (old) =>
          Array.isArray(old)
            ? old.map(p => p.id !== activePlan.id ? p : {
                ...p,
                members: (p.members || []).map(m => m.id === r.member.id ? { ...m, ...r.member } : m),
              })
            : old
        )
      } else {
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      }
      const labels = {
        block: '🔒 Bloke!', unblock: '🔓 Debloke!',
        stop: '⏸️ Kanpe!', resume: '▶️ Reprann!', payout: '🏆 Touche konfime!',
        schedule_payout: '📅 Dat peman deklare!', cancel_scheduled_payout: '✖️ Dat pwomès anile.',
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
      // ⚠️ KORIJE EGRESS — tiraj la sèlman chanje `hasWon` pou GANYAN an,
      // pa gen okenn lòt manm ki afekte — patch lokal san danje.
      if (r?.winner?.id && activePlan?.id) {
        qc.setQueryData(['sabotay-plans'], (old) =>
          Array.isArray(old)
            ? old.map(p => p.id !== activePlan.id ? p : {
                ...p,
                members: (p.members || []).map(m => m.id === r.winner.id ? { ...m, ...r.winner } : m),
              })
            : old
        )
      } else {
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      }
      toast.success(`🏆 ${r.winner?.name || 'Manm'} chwazi pa tiraj!`)
      if (activePlan) printer.print(activePlan, r.winner || {}, [], tenant, 'tirage')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Toggle Pozisyon Dinamik ──────────────────────────────
  const toggleDynamic = useMutation({
    mutationFn: (planId) =>
      apiFetch(`/sabotay/plans/${planId}/toggle-dynamic`, { method: 'PATCH' }),
    onSuccess: (r, planId) => {
      // ⚠️ KORIJE EGRESS — si li AKTIVE (newValue true), sèvè a rekalkile
      // pozisyon TOUT manm yo imedyatman (ranking service), donk nou pa ka
      // patch san danje — refè demann. Si li DEZAKTIVE, se sèlman yon flag
      // ki chanje — patch lokal san danje.
      if (r?.dynamicPositions === true) {
        qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      } else {
        qc.setQueryData(['sabotay-plans'], (old) =>
          Array.isArray(old)
            ? old.map(p => (p.id === planId ? { ...p, dynamicPositions: r?.dynamicPositions } : p))
            : old
        )
      }
      toast.success(r.message || '✅ Chanjman sove!')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Toggle Lè Manyèl (kesye ka antre lè reyèl peman an) ──
  const toggleManualTime = useMutation({
    mutationFn: (planId) =>
      apiFetch(`/sabotay/plans/${planId}/toggle-manual-time`, { method: 'PATCH' }),
    onSuccess: (r, planId) => {
      // ⚠️ KORIJE EGRESS — flag senp, pa gen efè sou lòt manm — patch lokal.
      qc.setQueryData(['sabotay-plans'], (old) =>
        Array.isArray(old)
          ? old.map(p => (p.id === planId ? { ...p, manualPaymentTime: r?.manualPaymentTime } : p))
          : old
      )
      toast.success(r.message || '✅ Chanjman sove!')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Toggle Kache Pozisyon nan Kont Sol ───────────────────
  const toggleHidePosition = useMutation({
    mutationFn: (planId) =>
      apiFetch(`/sabotay/plans/${planId}/toggle-hide-position`, { method: 'PATCH' }),
    onSuccess: (r, planId) => {
      // ⚠️ KORIJE EGRESS — flag senp, pa gen efè sou lòt manm — patch lokal.
      qc.setQueryData(['sabotay-plans'], (old) =>
        Array.isArray(old)
          ? old.map(p => (p.id === planId ? { ...p, hidePositionInSol: r?.hidePositionInSol } : p))
          : old
      )
      toast.success(r.message || '✅ Chanjman sove!')
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Rekalile Pozisyon Manyèlman ─────────────────────────
  // ℹ️ PA KORIJE — rekalkile pozisyon/skò TOUT manm yo (ranking service),
  // repons lan retounen sèlman yon kantite ("recalculated: N"), pa done
  // chak manm — refè demann lan se sèl fason kenbe done yo egzat isit la.
  const recalculate = useMutation({
    mutationFn: (planId) =>
      apiFetch(`/sabotay/plans/${planId}/recalculate`, { method: 'POST' }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
      toast.success(`🔄 ${r.recalculated} manm reklase!`)
    },
    onError: (e) => toast.error(e.message),
  })

  // ℹ️ PA KORIJE — ajiste pozisyon ka deplase PLIZYÈ lòt manm (tout moun ki
  // ant ansyen ak nouvo pozisyon an), men repons lan retounen sèlman
  // oldPosition/newPosition/shifted (yon kantite) — pa lis manm ki deplase
  // yo ak nouvo pozisyon yo. San done sa yo, patch lokal ta kite lòt manm
  // yo ak move pozisyon afiche — refè demann pou rete kòrèk.
  const adjustPosition = useMutation({
  mutationFn: ({ planId, memberId, steps }) =>
    apiFetch(`/sabotay/plans/${planId}/members/${memberId}/adjust-position`, {
      method: 'POST', body: JSON.stringify({ steps })
    }),
  onSuccess: (r) => {
    qc.invalidateQueries({ queryKey: ['sabotay-plans'] })
    toast.success(`✅ Pozisyon ajiste: #${r.oldPosition} → #${r.newPosition}`)
  },
  onError: (e) => toast.error(e.message),
})

  return {
    createPlan, updatePlan, closePlan,
    addMember, markPayment, memberAction, blindDraw,
    toggleDynamic, toggleManualTime, toggleHidePosition, recalculate,
    adjustPosition,
  }
}