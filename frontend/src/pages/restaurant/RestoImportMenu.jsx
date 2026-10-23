// src/pages/restaurant/RestoImportMenu.jsx
// ─── Enpòte yon meni antye (JSON oswa CSV) ────────────────────────────
// JSON: { "categories": [ { "name": "Pizzas", "items": [ { "name": "Pizza poulet (S)", "priceHtg": 1000 } ] } ] }
// CSV : Kategori;Plat;Pri   (oswa ak vigil) — premye liy lan ka yon antèt.
import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileUp, Check } from 'lucide-react'
import { restoApi } from './restoApi'
import { Btn, Modal, Field, money } from './restoUI'

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const sep = (lines[0] || '').includes(';') ? ';' : ','
  const cats = new Map()
  lines.forEach((line, idx) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
    if (cols.length < 3) return
    const price = Number(String(cols[2]).replace(/[^\d.,]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'))
    if (idx === 0 && !(price > 0)) return // antèt
    if (!cols[1] || !(price > 0)) return
    const key = cols[0] || 'Meni'
    if (!cats.has(key)) cats.set(key, [])
    cats.get(key).push({ name: cols[1], priceHtg: price, description: cols[3] || '' })
  })
  return { categories: [...cats].map(([name, items]) => ({ name, items })) }
}

function normalize(obj) {
  const cats = Array.isArray(obj?.categories) ? obj.categories : []
  return {
    quantity: Number(obj?.quantity) > 0 ? Number(obj.quantity) : 100,
    categories: cats
      .map((c) => ({ name: String(c?.name || '').trim(), items: (Array.isArray(c?.items) ? c.items : []).filter((i) => i?.name && Number(i.priceHtg) > 0) }))
      .filter((c) => c.name && c.items.length),
  }
}

export default function RestoImportMenu({ open, theme, t, onClose, onStarted, busy }) {
  const qc = useQueryClient()
  const input = useRef(null)
  const [menu, setMenu] = useState(null)
  const [fileName, setFileName] = useState('')
  const [qty, setQty] = useState(100)
  const total = menu ? menu.categories.reduce((a, c) => a + c.items.length, 0) : 0

  const reset = () => { setMenu(null); setFileName(''); if (input.current) input.current.value = '' }
  const close = () => { reset(); onClose() }

  const onFile = async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = /\.json$/i.test(file.name) || text.trim().startsWith('{') ? JSON.parse(text) : parseCsv(text)
      const n = normalize(parsed)
      if (!n.categories.length) throw new Error('empty')
      setMenu(n); setQty(n.quantity); setFileName(file.name)
    } catch { reset(); toast.error(t('imp.invalid')) }
  }

  const running = useRef(false) // ✅ KORIJE — anpeche doub klik voye 2 enpòtasyon
  const run = useMutation({
    mutationFn: async () => {
      if (running.current) return { result: {} }
      running.current = true
      try { return await restoApi.importMenu({ categories: menu.categories, quantity: qty }) } finally { running.current = false }
    },
    // ✅ KORIJE — sèvè a reponn touswit ak yon « job »; pwogrè a parèt sou paj Meni an
    onSuccess: (res) => { if (res?.job) onStarted?.(res.job); close() },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  return (
    <Modal open={open} theme={theme} title={t('imp.title')} onClose={close} size="lg"
      footer={<>
        <Btn variant="glass" onClick={close}>{t('common.cancel')}</Btn>
        <Btn icon={Check} disabled={!menu || !total || run.isPending || busy} loading={run.isPending} onClick={() => { if (!run.isPending) run.mutate() }}>{t('imp.confirm', { count: total })}</Btn>
      </>}>
      <div className="rs-form">
        <p className="rs-hint" style={{ margin: 0 }}>{t('imp.desc')}</p>
        <input ref={input} type="file" accept=".json,.csv,application/json,text/csv,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Btn variant="glass" icon={FileUp} onClick={() => input.current?.click()}>{fileName || t('imp.choose')}</Btn>

        {menu && (
          <>
            <div className="rs-alert rs-alert--info">{t('imp.preview', { items: total, cats: menu.categories.length })}</div>
            <div className="rs-imp">
              {menu.categories.map((c) => (
                <div key={c.name} className="rs-imp__cat">
                  <b>{c.name} <span className="rs-hint">· {c.items.length}</span></b>
                  <ul>{c.items.map((i) => <li key={i.name}><span>{i.name}</span><span className="rs-mono">{money(Number(i.priceHtg), 0)}</span></li>)}</ul>
                </div>
              ))}
            </div>
            <Field label={t('imp.qty')} hint={t('imp.qtyHint')}>
              <input type="number" min="1" className="rs-input rs-mono" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  )
}