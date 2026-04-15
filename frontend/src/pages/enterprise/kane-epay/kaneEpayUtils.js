// src/pages/enterprise/kane-epay/kaneEpayUtils.js
import { format } from 'date-fns'
import { fr }     from 'date-fns/locale'
import toast      from 'react-hot-toast'
import { useState, useCallback } from 'react'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printKaneReceipt } from '../../../services/printerService'

export const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '' }
}

export const fmtShort = (d) => {
  try { return format(new Date(d), 'dd/MM HH:mm', { locale: fr }) } catch { return '' }
}

export function getAccountPrefix(tenant) {
  const name  = tenant?.businessName || tenant?.name || ''
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length)      return 'KE'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export function buildReceiptHTML(account, transaction, tenant, type = 'ouverture') {
  const biz  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logo = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`
    : ''
  const labels = { ouverture:'OUVERTURE KONT', depot:'DEPO / DÉPÔT', retrait:'RETRÈ / RETRAIT' }
  const color  = type === 'retrait' ? '#dc2626' : '#16a34a'
  const txDate = transaction?.createdAt ? fmtDate(transaction.createdAt) : fmtDate(new Date())

  return `<div style="width:80mm;padding:4mm 3mm;font-family:'Courier New',monospace;font-size:10px;line-height:1.5;color:#1a1a1a">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:6px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- KANÈ EPAY --</div>
      ${tenant?.phone ? `<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>` : ''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px">
      ${labels[type] || 'TRANZAKSYON'}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span>No. Kont:</span><b>${account.accountNumber}</b></div>
      <div style="display:flex;justify-content:space-between"><span>Dat:</span><span>${txDate}</span></div>
    </div>
    <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid #ccc;margin-bottom:5px;font-size:9px">
      <b>${account.firstName} ${account.lastName}</b>
      ${account.phone ? `<div>Tel: ${account.phone}</div>` : ''}
      ${account.nifOrCin ? `<div>NIF/CIN: ${account.nifOrCin}</div>` : ''}
    </div>
    <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
      ${type === 'ouverture' ? `
        <div style="display:flex;justify-content:space-between"><span>Montan:</span><b>${fmt(account.openingAmount)} HTG</b></div>
        <div style="display:flex;justify-content:space-between"><span>Frè:</span><span style="color:#dc2626">- ${fmt(account.kaneFee)} HTG</span></div>
      ` : `<div style="display:flex;justify-content:space-between"><span>Balans anvan:</span><span>${fmt(transaction?.balanceBefore)} HTG</span></div>`}
      <div style="border-top:2px solid #111;padding-top:4px;margin-top:3px;display:flex;justify-content:space-between">
        <b style="font-family:Arial;font-size:12px">${type==='retrait'?'RETRÈ':type==='depot'?'DEPO':'BALANS'}</b>
        <b style="font-family:Arial;font-size:14px;color:${color}">${type==='ouverture'?fmt(account.balance):fmt(transaction?.amount)} HTG</b>
      </div>
      ${type !== 'ouverture' ? `<div style="display:flex;justify-content:space-between;margin-top:3px"><span>Nouvo balans:</span><b style="color:#16a34a">${fmt(transaction?.balanceAfter)} HTG</b></div>` : ''}
    </div>
    ${transaction?.method ? `<div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span>Metod:</span><b>${transaction.method.toUpperCase()}</b></div>
      ${transaction.reference ? `<div style="display:flex;justify-content:space-between"><span>Ref:</span><span>${transaction.reference}</span></div>` : ''}
    </div>` : ''}
    <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px">
      <b>Mèsi! / Merci!</b><br/><span style="color:#666;font-size:8px">PlusGroup — Tel: +50942449024</span>
    </div>
  </div>`
}

export function printReceiptBrowser(html) {
  const w = window.open('', '_blank', 'width=340,height=620')
  if (!w) { toast.error('Pemit popup pou sit sa.'); return }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
    <style>*{box-sizing:border-box}body{margin:0;background:#fff}@media print{@page{margin:0;size:80mm auto}body{margin:0}}</style>
    </head><body>${html}</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 2000) }, 300)
}

export function usePrinter() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try { const name = await connectPrinter(); setConnected(true); toast.success(`✅ ${name} konekte`) }
    catch (e) { if (e.name !== 'NotFoundError') toast.error('Pa ka konekte printer.') }
    finally { setConnecting(false) }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter(); setConnected(false); toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  const print = useCallback(async (account, transaction, tenant, type) => {
    if (isPrinterConnected()) {
      setPrinting(true)
      try { await printKaneReceipt(account, transaction, tenant, type); toast.success('Resi enprime!'); return true }
      catch { setConnected(false); toast.error('Erè printer.'); return false }
      finally { setPrinting(false) }
    }
    printReceiptBrowser(buildReceiptHTML(account, transaction, tenant, type))
    return true
  }, [])

  return { connected, connecting, printing, connect, disconnect, print }
}
