// src/pages/restaurant/RestoMenuJob.jsx
// ─── Swiv travay an aryè-plan sou meni an (enpòte / retire doub) ──────
// Backend lan reponn touswit; isit la nou mande pwogrè a chak 1.2 s jiskaske
// li fini, epi nou montre yon ba pwogrè. Pa gen « Erè koneksyon » ankò.
import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { restoApi } from './restoApi'

const MENU_KEYS = ['restaurant-menu', 'restaurant-categories', 'restaurant-summary', 'restaurant-kinds', 'restaurant-shared']

export function useMenuJob(t) {
  const qc = useQueryClient()
  const { data: job } = useQuery({
    queryKey: ['restaurant-menu-job'],
    queryFn: restoApi.menuJob,
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 1200 : false),
    refetchOnWindowFocus: true,
    retry: false,
  })
  const announced = useRef(null)
  useEffect(() => {
    if (!job || job.status === 'running') return
    // Anonse rezilta a yon sèl fwa pa job (menm si paj la te rechaje)
    let seen = null
    try { seen = sessionStorage.getItem('resto-job-seen') } catch { /* */ }
    if (announced.current === job.id || seen === job.id) { announced.current = job.id; return }
    announced.current = job.id
    try { sessionStorage.setItem('resto-job-seen', job.id) } catch { /* */ }
    // Pa anonse yon ansyen travay ki te fini lontan anvan paj la louvri
    if (job.finishedAt && Date.now() - new Date(job.finishedAt).getTime() > 2 * 60 * 1000) return
    MENU_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    if (job.status === 'error') { toast.error(t('imp.jobFailed', { error: job.error || '' })); return }
    const r = job.result || {}
    if (job.type === 'import') toast.success(t('imp.done', { created: r.created || 0, skipped: r.skipped || 0 }), { duration: 6000 })
    else toast.success(t('imp.dedupeDone', { items: r.itemsRemoved || 0, cats: r.categoriesMerged || 0 }), { duration: 6000 })
    if (r.errors?.length) toast.error(t('imp.errors', { count: r.errors.length }))
  }, [job, qc, t])
  const running = job?.status === 'running'
  // Lanse yon travay: backend lan reponn ak job la → kòmanse swiv li
  const track = (startedJob) => { if (startedJob) qc.setQueryData(['restaurant-menu-job'], startedJob) }
  return { job, running, track }
}

export function MenuJobBanner({ job, t }) {
  if (!job || job.status !== 'running') return null
  const pct = job.total ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0
  return (
    <div className="rs-job rs-glass" role="status" aria-live="polite">
      <Loader2 size={18} className="rs-job__spin" />
      <div className="rs-job__body">
        <b>{t(job.type === 'import' ? 'imp.jobImport' : 'imp.jobDedupe', { done: job.done, total: job.total || '…' })}</b>
        <div className="rs-job__track"><span style={{ width: `${pct}%` }} /></div>
        <small>{t('imp.jobKeep')}</small>
      </div>
    </div>
  )
}