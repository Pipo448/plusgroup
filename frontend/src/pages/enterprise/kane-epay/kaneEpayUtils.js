// src/pages/enterprise/kane-epay/kaneEpayUtils.js
import { format } from 'date-fns'
import { fr }     from 'date-fns/locale'
import toast      from 'react-hot-toast'
import { useState, useCallback } from 'react'
import jsPDF       from 'jspdf'
import html2canvas from 'html2canvas'
import { toCanvas } from 'html-to-image'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printKaneReceipt } from '../../../services/printerService'
import { PAYMENT_METHODS, FRE_OUVERTURE } from './kaneEpayConstants'

export const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '' }
}

export const fmtShort = (d) => {
  try { return format(new Date(d), 'dd/MM HH:mm', { locale: fr }) } catch { return '' }
}

// ✅ Pwoteksyon: chape tèks kliyan an anvan nou mete l nan HTML
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))

const methodLabel = (m) => PAYMENT_METHODS.find(x => x.value === m)?.label || (m ? String(m).toUpperCase() : '—')

export function getAccountPrefix(tenant) {
  const name  = tenant?.businessName || tenant?.name || ''
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length)      return 'KE'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// ═══════════════════════════════════════════════════════════════
// RESI TERMIK 80mm (enprimant navigatè) — pa chanje fòma a
// ═══════════════════════════════════════════════════════════════
export function buildReceiptHTML(account, transaction, tenant, type = 'ouverture') {
  const biz  = esc(tenant?.businessName || tenant?.name || 'PLUS GROUP')
  const logo = tenant?.logoUrl
    ? `<img src="${esc(tenant.logoUrl)}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`
    : ''
  const labels = { ouverture:'OUVERTURE KONT', depot:'DEPO / DÉPÔT', retrait:'RETRÈ / RETRAIT' }
  const color  = type === 'retrait' ? '#dc2626' : '#16a34a'
  const txDate = transaction?.createdAt ? fmtDate(transaction.createdAt) : fmtDate(new Date())

  return `<div style="width:80mm;padding:4mm 3mm;font-family:'Courier New',monospace;font-size:10px;line-height:1.5;color:#1a1a1a">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:6px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- KANÈ EPAY --</div>
      ${tenant?.phone ? `<div style="font-size:9px;color:#555">Tel: ${esc(tenant.phone)}</div>` : ''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px">
      ${labels[type] || 'TRANZAKSYON'}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span>No. Kont:</span><b>${esc(account.accountNumber)}</b></div>
      <div style="display:flex;justify-content:space-between"><span>Dat:</span><span>${txDate}</span></div>
    </div>
    <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid #ccc;margin-bottom:5px;font-size:9px">
      <b>${esc(account.firstName)} ${esc(account.lastName)}</b>
      ${account.phone ? `<div>Tel: ${esc(account.phone)}</div>` : ''}
      ${account.nifOrCin ? `<div>NIF/CIN: ${esc(account.nifOrCin)}</div>` : ''}
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
      <div style="display:flex;justify-content:space-between"><span>Metod:</span><b>${esc(transaction.method).toUpperCase()}</b></div>
      ${transaction.reference ? `<div style="display:flex;justify-content:space-between"><span>Ref:</span><span>${esc(transaction.reference)}</span></div>` : ''}
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

// ═══════════════════════════════════════════════════════════════
// RESI POU PATAJE (Imaj PNG + PDF) — design "Plus Fit"
// Gwo tit Barlow Condensed, tèt nwa ak lò, kat kliyan, tikè koupe
// ═══════════════════════════════════════════════════════════════
const RC = {
  bg: '#ECE8DF', night: '#0b0c0f', gold: '#FFC83D', goldInk: '#8A6508',
  ink: '#14151a', muted: '#6b7080', soft: '#f4f3ef', line: '#E6E3DB',
  green: '#16a34a', red: '#dc2626', orange: '#d97706',
}
const DISPLAY = "'Barlow Condensed','Arial Narrow',Arial,sans-serif"
const BODY    = "'Manrope','Segoe UI',Arial,sans-serif"

export const RECEIPT_WIDTH = 460

export function buildShareReceiptHTML(account, transaction, tenant, type = 'ouverture') {
  const tx      = transaction || {}
  const biz     = esc(tenant?.businessName || tenant?.name || 'PLUS GROUP')
  const bizIni  = esc((tenant?.businessName || tenant?.name || 'PG').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())
  const name    = `${esc(account.firstName)} ${esc(account.lastName)}`
  const ini     = esc(`${account.firstName?.[0] || ''}${account.lastName?.[0] || ''}`.toUpperCase())
  const date    = fmtDate(tx.createdAt || account.createdAt || new Date())
  const isOpen  = type === 'ouverture'
  const isW     = type === 'retrait'

  const fee     = Number(account.kaneFee ?? FRE_OUVERTURE)
  const locked  = Number(account.lockedAmount || 0)
  const opening = Number(account.openingAmount ?? (Number(account.balance || 0) + fee + locked))

  const pill = isOpen ? { t: 'OUVERTURE', bg: RC.gold, c: RC.night }
             : isW    ? { t: 'RETRÈ',     bg: '#ff7b7b', c: RC.night }
             :          { t: 'DEPO',      bg: '#4ade80', c: RC.night }
  const bigColor = isOpen ? RC.gold : isW ? '#ff8f8f' : '#5ee59a'
  const bigLabel = isOpen ? 'DEPO OUVERTURE' : isW ? 'MONTAN RETRÈ' : 'MONTAN DEPO'
  const bigVal   = isOpen ? fmt(opening) : `${isW ? '−' : '+'}${fmt(tx.amount)}`
  const finalLbl = isOpen ? 'BALANS KONT' : 'NOUVO BALANS'
  const finalVal = isOpen ? fmt(account.balance) : fmt(tx.balanceAfter ?? account.balance)

  const row = (k, v, color = RC.ink, strong = false) => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid ${RC.line}">
      <span style="font-size:13px;font-weight:600;line-height:1.3;color:${RC.muted}">${k}</span>
      <span style="font-size:${strong ? 15 : 13.5}px;font-weight:800;line-height:1.3;color:${color};text-align:right">${v}</span>
    </div>`

  const rows = isOpen ? [
    row('Montan peye', `${fmt(opening)} HTG`),
    row('Frè ouverture', `− ${fmt(fee)} HTG`, RC.red),
    locked > 0 ? row('Montan bloke', `− ${fmt(locked)} HTG`, RC.orange) : '',
    row('Metòd', esc(methodLabel(tx.method))),
    tx.reference ? row('Referans', esc(tx.reference)) : '',
  ] : [
    row('Balans anvan', `${fmt(tx.balanceBefore)} HTG`),
    row(isW ? 'Retrè' : 'Depo', `${isW ? '−' : '+'} ${fmt(tx.amount)} HTG`, isW ? RC.red : RC.green, true),
    row('Metòd', esc(methodLabel(tx.method))),
    tx.reference ? row('Referans', esc(tx.reference)) : '',
  ]

  // Tout tèks gen line-height eksplisit ≥ 1.15 epi pa gen overflow:hidden sou tèks —
  // konsa resi a rete pwòp menm si se rezèv html2canvas la ki fè imaj la.
  const LH = 'line-height:1.25'
  const bizRaw  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const bizSize = bizRaw.length > 26 ? 18 : bizRaw.length > 18 ? 21 : 25
  const txNo    = tx.id ? `#${esc(String(tx.id).slice(-8).toUpperCase())}` : ''

  const logo = tenant?.logoUrl
    ? `<img src="${esc(tenant.logoUrl)}" crossorigin="anonymous" style="width:50px;height:50px;border-radius:15px;object-fit:cover;background:#fff;display:block;flex:none"/>`
    : `<div style="width:50px;height:50px;border-radius:15px;background:${RC.gold};display:flex;align-items:center;justify-content:center;flex:none"><span style="font-family:${DISPLAY};font-weight:800;font-size:22px;${LH};color:${RC.night}">${bizIni}</span></div>`

  const footNote = tenant?.receiptFooterNote ? `<div style="font-size:12px;color:${RC.muted};font-weight:600;margin-bottom:8px;line-height:1.45">${esc(tenant.receiptFooterNote)}</div>` : ''

  return `
<div style="width:${RECEIPT_WIDTH}px;padding:22px;background:${RC.bg};font-family:${BODY};color:${RC.ink};box-sizing:border-box;${LH};text-align:left">
  <div style="border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 24px 40px -24px rgba(11,12,15,.45)">

    <div style="position:relative;overflow:hidden;background:${RC.night};padding:16px 24px 24px;color:#f2f1ec">
      <div style="position:absolute;width:340px;height:340px;right:-120px;top:-170px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.32),rgba(255,200,61,0) 65%)"></div>

      <div style="position:relative;display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,.1)">
        <span style="font-size:13px;font-weight:800;${LH};color:#fff;letter-spacing:.02em">${date}</span>
        <span style="font-size:11px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.6)">RESI ${txNo}</span>
      </div>

      <div style="position:relative;display:flex;align-items:center;gap:12px">
        ${logo}
        <div style="min-width:0;flex:1">
          <div style="font-family:${DISPLAY};font-weight:800;font-size:${bizSize}px;${LH};text-transform:uppercase;letter-spacing:.02em;color:#fff;word-break:break-word">${biz}</div>
          <div style="font-size:10.5px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.55);margin-top:2px">KANÈ EPAY${tenant?.phone ? ` · ${esc(tenant.phone)}` : ''}</div>
        </div>
        <div style="height:32px;padding:0 13px;border-radius:999px;background:${pill.bg};display:flex;align-items:center;flex:none">
          <span style="font-family:${DISPLAY};font-weight:800;font-size:15px;${LH};letter-spacing:.08em;color:${pill.c}">${pill.t}</span>
        </div>
      </div>

      <div style="position:relative;margin-top:22px;font-size:11px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.6)">${bigLabel}</div>
      <div style="position:relative;margin-top:2px;white-space:nowrap">
        <span style="font-family:${DISPLAY};font-weight:800;font-size:64px;line-height:1.15;color:${bigColor}">${bigVal}</span><span style="font-family:${DISPLAY};font-weight:800;font-size:22px;line-height:1.15;color:rgba(242,241,236,.55);margin-left:8px;letter-spacing:.05em">HTG</span>
      </div>
    </div>

    <div style="position:relative;height:24px;background:#fff">
      <div style="position:absolute;left:-12px;top:0;width:24px;height:24px;border-radius:50%;background:${RC.bg}"></div>
      <div style="position:absolute;right:-12px;top:0;width:24px;height:24px;border-radius:50%;background:${RC.bg}"></div>
      <div style="position:absolute;left:22px;right:22px;top:11px;border-top:2px dashed ${RC.line}"></div>
    </div>

    <div style="padding:0 24px">
      <div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:${RC.soft}">
        <div style="width:48px;height:48px;border-radius:14px;background:${RC.night};display:flex;align-items:center;justify-content:center;flex:none">
          <span style="font-family:${DISPLAY};font-weight:800;font-size:20px;${LH};color:${RC.gold}">${ini}</span>
        </div>
        <div style="min-width:0;flex:1">
          <div style="font-weight:800;font-size:16px;${LH};word-break:break-word">${name}</div>
          <div style="font-family:${DISPLAY};font-weight:700;font-size:16px;${LH};letter-spacing:.08em;color:${RC.goldInk};margin-top:1px">${esc(account.accountNumber)}</div>
        </div>
        ${account.phone || account.nifOrCin ? `<div style="text-align:right;font-size:11.5px;font-weight:600;color:${RC.muted};line-height:1.5;flex:none">
          ${account.phone ? esc(account.phone) : ''}${account.nifOrCin ? `<br/>NIF ${esc(account.nifOrCin)}` : ''}
        </div>` : ''}
      </div>
    </div>

    <div style="padding:8px 24px 0">${rows.join('')}</div>

    <div style="margin:16px 24px 0;padding:14px 18px;border-radius:18px;background:${RC.night};display:flex;justify-content:space-between;align-items:center;gap:10px">
      <span style="font-size:11px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.6)">${finalLbl}</span>
      <span style="white-space:nowrap"><span style="font-family:${DISPLAY};font-weight:800;font-size:34px;line-height:1.2;color:${RC.gold}">${finalVal}</span><span style="font-family:${DISPLAY};font-weight:800;font-size:14px;line-height:1.2;color:rgba(242,241,236,.55);margin-left:6px">HTG</span></span>
    </div>
    ${locked > 0 && !isOpen ? `<div style="margin:8px 24px 0;font-size:12px;font-weight:700;${LH};color:${RC.orange};text-align:right">Bloke sou kont lan: ${fmt(locked)} HTG</div>` : ''}

    <div style="display:flex;justify-content:center;padding:18px 24px 0">
      <div style="height:34px;padding:0 15px;border-radius:999px;background:rgba(22,163,74,.1);display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${RC.green}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        <span style="font-size:12px;font-weight:800;${LH};letter-spacing:.04em;color:${RC.green}">TRANZAKSYON KONFIME</span>
      </div>
    </div>

    <div style="text-align:center;padding:16px 26px 22px">
      ${footNote}
      <div style="font-family:${DISPLAY};font-weight:800;font-size:22px;${LH};letter-spacing:.04em;text-transform:uppercase;color:${RC.ink}">Mèsi! / Merci!</div>
      <div style="font-size:11px;font-weight:700;${LH};color:${RC.muted};margin-top:4px;letter-spacing:.02em">Produit par PLUS GROUP · Tel: +509 4244 9024</div>
    </div>
  </div>
</div>`
}

// ✅ Kaptire resi a an imaj. Premye chwa: html-to-image — se navigatè a menm ki desine l,
// kidonk imaj la idantik ak aperçu a. Si li echwe, n ap itilize html2canvas kòm rezèv.
async function captureNode(node, bg) {
  try {
    const opts = { pixelRatio: 2.5, backgroundColor: bg, cacheBust: true }
    // Premye apèl la chaje polis ak imaj yo (sitou sou iPhone/Safari), dezyèm nan bon
    await toCanvas(node, opts)
    const canvas = await toCanvas(node, opts)
    if (canvas?.width > 0 && canvas?.height > 0) return canvas
    throw new Error('canvas vid')
  } catch (e) {
    console.warn('[resi] html-to-image echwe, n ap itilize html2canvas:', e?.message)
    return await html2canvas(node, { scale: 2.5, backgroundColor: bg, useCORS: true, logging: false })
  }
}

// Rann resi a nan yon canvas (an deyò ekran an)
async function renderReceiptCanvas(account, transaction, tenant, type) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;'
  container.innerHTML = buildShareReceiptHTML(account, transaction, tenant, type)
  document.body.appendChild(container)
  try {
    // Tann polis yo (Barlow / Manrope) ak imaj yo fin chaje
    try {
      await Promise.all([
        document.fonts?.load?.(`800 60px "Barlow Condensed"`),
        document.fonts?.load?.(`700 14px "Manrope"`),
        document.fonts?.load?.(`800 14px "Manrope"`),
      ])
      await document.fonts?.ready
    } catch { /* polis pa disponib (offline) — n ap itilize polis sistèm */ }
    const imgs = Array.from(container.querySelectorAll('img'))
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res })))
    return await captureNode(container.firstElementChild, RC.bg)
  } finally {
    document.body.removeChild(container)
  }
}

function fileSafe(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
}

export function receiptFileName(account, type, ext = 'pdf') {
  const labels = { ouverture: 'Enskripsyon', depot: 'Depo', retrait: 'Retre' }
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`
  return `KaneEpay-${fileSafe(account.accountNumber)}-${labels[type] || 'Resi'}-${stamp}.${ext}`
}

export async function generateReceiptImageBlob(account, transaction, tenant, type = 'ouverture') {
  const canvas = await renderReceiptCanvas(account, transaction, tenant, type)
  return await new Promise(res => canvas.toBlob(res, 'image/png'))
}

export async function generateReceiptPDFBlob(account, transaction, tenant, type = 'ouverture') {
  const canvas = await renderReceiptCanvas(account, transaction, tenant, type)
  const imgData = canvas.toDataURL('image/jpeg', 0.9)   // JPEG = PDF pi lejè (~300 Ko)
  const wMm = 100
  const hMm = (canvas.height * wMm) / canvas.width
  const pdf = new jsPDF({ unit: 'mm', format: [wMm, Math.max(hMm, 60)] })
  pdf.addImage(imgData, 'JPEG', 0, 0, wMm, hMm)
  return pdf.output('blob')
}

// ✅ Mobil: meni pataje natif (WhatsApp, Imèl...). PC: telechaje.
// format: 'png' (imaj — parèt dirèk nan WhatsApp) oswa 'pdf'
export async function shareReceipt(account, transaction, tenant, type = 'ouverture', fmtOut = 'pdf') {
  const isPng = fmtOut === 'png'
  const blob  = isPng
    ? await generateReceiptImageBlob(account, transaction, tenant, type)
    : await generateReceiptPDFBlob(account, transaction, tenant, type)
  const fileName = receiptFileName(account, type, isPng ? 'png' : 'pdf')
  const file = new File([blob], fileName, { type: isPng ? 'image/png' : 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Resi Kanè Epay — ${account.accountNumber}`,
        text: `Resi ${account.firstName} ${account.lastName} — ${account.accountNumber}`,
      })
      return true
    } catch (e) {
      if (e?.name === 'AbortError') return false
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return true
}

// Konpatibilite ak ansyen non an
export const downloadOrShareReceiptPDF = (account, transaction, tenant, type) => shareReceipt(account, transaction, tenant, type, 'pdf')

export function usePDFReceipt() {
  const [generating, setGenerating] = useState(false)

  const share = useCallback(async (account, transaction, tenant, type, fmtOut = 'pdf') => {
    setGenerating(fmtOut)
    try {
      const ok = await shareReceipt(account, transaction, tenant, type, fmtOut)
      if (ok) toast.success(fmtOut === 'png' ? 'Imaj resi a pare!' : 'PDF la pare!')
      return ok
    } catch (e) {
      toast.error('Erè pandan kreyasyon resi a.')
      return false
    } finally {
      setGenerating(false)
    }
  }, [])

  return { generating, share }
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