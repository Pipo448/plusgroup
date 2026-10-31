// src/pages/restaurant/RestoPayModal.jsx
// ─── Fenèt peman pataje: Tab & Kòmand + Kès (vann kontwa) ─────────────
// Metòd (kach, MonCash, NatCash, kat), rabè %, kòb kliyan bay ak monnen.
import { useState } from 'react'
import { Check, CreditCard, Banknote, Smartphone } from 'lucide-react'
import { Btn, Modal, Field, money, cx, useCountUp } from './restoUI'

const METHODS = [
  { id: 'cash', icon: Banknote }, { id: 'moncash', icon: Smartphone }, { id: 'natcash', icon: Smartphone }, { id: 'card', icon: CreditCard },
]
export default function PayModal({ theme, subtotal, extra = 0, title, confirmLabel, loading, onConfirm, onClose, t }) {
  const [method, setMethod] = useState('cash')
  const [discount, setDiscount] = useState(0)
  const [given, setGiven] = useState('')
  const d = Math.min(100, Math.max(0, Number(discount) || 0))
  // extra = frè livrezon (pa gen rabè sou li)
  const total = Math.round((subtotal * (1 - d / 100) + Number(extra || 0)) * 100) / 100
  const givenN = method === 'cash' ? (given === '' ? total : Number(given) || 0) : total
  const diff = givenN - total
  const shownTotal = useCountUp(total, 400)
  const quick = [...new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000])].filter((v) => v >= total).slice(0, 4)
  return (
    <Modal theme={theme} title={title || t('tables.order.pay.title')} onClose={onClose} closeLabel={t('common.close')}
      footer={<><Btn variant="glass" onClick={onClose}>{t('common.cancel')}</Btn>
        <Btn variant="success" icon={Check} loading={loading} disabled={diff < 0}
          onClick={() => onConfirm({ method, discountPct: d, total, given: givenN, change: Math.max(0, diff) })}>{confirmLabel || t('tables.order.pay.confirm')}</Btn></>}>
      <div className="rs-form">
        <Field label={t('tables.order.pay.method')}>
          <div className="rs-pay-grid">
            {METHODS.map((m) => (
              <button key={m.id} type="button" className={cx('rs-pay-opt', method === m.id && 'is-active')} onClick={() => setMethod(m.id)}>
                <m.icon size={20} /> {t(`tables.order.pay.${m.id}`)}
              </button>
            ))}
          </div>
        </Field>
        <div className="rs-form-grid">
          <Field label={t('tables.order.pay.discount')}><input type="number" min="0" max="100" className="rs-input rs-mono" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          {method === 'cash' && <Field label={t('tables.order.pay.given')}><input type="number" min="0" className="rs-input rs-mono" placeholder={String(total)} value={given} onChange={(e) => setGiven(e.target.value)} autoFocus /></Field>}
        </div>
        {method === 'cash' && (
          <div className="rs-quick">
            {quick.map((v, i) => <button key={v} type="button" onClick={() => setGiven(String(v))}>{i === 0 ? t('tables.order.pay.exact') : money(v, 0)}</button>)}
          </div>
        )}
        <dl className="rs-totals" style={{ marginTop: 0 }}>
          <div><dt>{t('tables.order.pay.subtotal')}</dt><dd>{money(subtotal)}</dd></div>
          {d > 0 && <div><dt>{t('tables.order.pay.discount')}</dt><dd>-{money(subtotal * d / 100)}</dd></div>}
          {extra > 0 && <div><dt>{t('pub.cart.deliveryFee')}</dt><dd>{money(extra)}</dd></div>}
        </dl>
        <div className="rs-total" style={{ marginTop: 0 }}><span className="rs-total__label">{t('tables.order.total')}</span><span className="rs-total__val">{money(shownTotal)}</span></div>
        {method === 'cash' && (
          <div className={cx('rs-change', diff < 0 && 'is-short')}>
            <span>{diff < 0 ? t('tables.order.pay.short') : t('tables.order.pay.change')}</span><b>{money(Math.abs(diff))}</b>
          </div>
        )}
      </div>
    </Modal>
  )
}

