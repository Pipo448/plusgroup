// src/pages/enterprise/pre/preUtils.js — Enpresyon + Resi pataje + Helpers
import { PERIODES } from './preConstants'
import { fmt }      from '../kaneShared.jsx'
import toast        from 'react-hot-toast'
import jsPDF        from 'jspdf'
import html2canvas  from 'html2canvas'
import { toCanvas } from 'html-to-image'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printPreReceipt } from '../../../services/printerService'
import { useState, useCallback } from 'react'

// ✅ Chape tèks kliyan an anvan li antre nan HTML
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
const periodLabel = (p) => PERIODES.find(x => x.value === p)?.label || p || '—'

// ═══════════════════════════════════════════════════════════════
// RESI TERMIK (57 / 80mm) — menm fòma ak anvan
// ═══════════════════════════════════════════════════════════════
export function genHtmlResi({ pre, echeances = [], tenant, type = 'ouverture', paiement = null, largeur = 80 }) {
  const biz   = esc(tenant?.businessName || tenant?.name || 'PLUS GROUP')
  const tel   = esc(tenant?.phone || '')
  const w     = largeur === 57 ? '57mm' : '80mm'
  const fs    = largeur === 57 ? '8px'  : '10px'
  const fsBig = largeur === 57 ? '11px' : '13px'
  const fmtD  = (d) => d ? new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'short', year:'numeric' }) : ''

  const ligneSignature = (label) => `
    <div style="margin-top:8px">
      <div style="font-size:${fs};color:#555;margin-bottom:2px">${label}:</div>
      <div style="border-bottom:1px solid #333;height:20px;margin-bottom:2px"></div>
      <div style="font-size:${fs};color:#555">Non & Siyati</div>
    </div>`

  let echeancierHtml = ''
  if (type === 'ouverture' && echeances.length > 0) {
    const lignes = echeances.map(e => `
      <tr>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs}">${e.numero}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs}">${fmtD(e.dat_limit || e.datLimit)}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs};text-align:right">${fmt(e.montant_capital || e.montantCapital)}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs};text-align:right">${fmt(e.montant_interet || e.montantInteret)}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs};text-align:right;font-weight:700">${fmt(e.montant_total || e.montantTotal)}</td>
      </tr>`).join('')
    echeancierHtml = `
      <div style="border-top:1px dashed #aaa;margin:6px 0;padding-top:5px">
        <div style="font-weight:800;font-size:${fs};margin-bottom:4px;text-align:center">KALANDRIYE REMBOURSEMAN</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:2px 3px;font-size:${fs};text-align:left">#</th>
            <th style="padding:2px 3px;font-size:${fs};text-align:left">Dat</th>
            <th style="padding:2px 3px;font-size:${fs};text-align:right">Kapital</th>
            <th style="padding:2px 3px;font-size:${fs};text-align:right">Enterè</th>
            <th style="padding:2px 3px;font-size:${fs};text-align:right">Total</th>
          </tr></thead>
          <tbody>${lignes}</tbody>
          <tfoot><tr style="background:#f5f5f5;font-weight:800">
            <td colspan="2" style="padding:2px 3px;font-size:${fs}">TOTAL</td>
            <td style="padding:2px 3px;font-size:${fs};text-align:right">${fmt(echeances.reduce((s,e)=>s+Number(e.montant_capital||e.montantCapital||0),0))}</td>
            <td style="padding:2px 3px;font-size:${fs};text-align:right">${fmt(echeances.reduce((s,e)=>s+Number(e.montant_interet||e.montantInteret||0),0))}</td>
            <td style="padding:2px 3px;font-size:${fs};text-align:right">${fmt(echeances.reduce((s,e)=>s+Number(e.montant_total||e.montantTotal||0),0))}</td>
          </tr></tfoot>
        </table>
      </div>`
  }

  let avalizelHtml = ''
  if (type === 'ouverture') {
    if (pre.avalize1Nom) avalizelHtml += ligneSignature(`Avalize 1: ${esc(pre.avalize1Nom)}`)
    if (pre.avalize2Nom) avalizelHtml += ligneSignature(`Avalize 2: ${esc(pre.avalize2Nom)}`)
  }

  return `
    <div style="width:${w};padding:4mm 3mm;font-family:'Courier New',monospace;font-size:${fs};line-height:1.5;color:#1a1a1a">
      <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:6px">
        <div style="font-family:Arial;font-weight:900;font-size:${fsBig}">${biz}</div>
        <div style="font-family:Arial;font-size:${fs};color:#444">-- MIKWO KREDI --</div>
        ${tel ? `<div style="font-size:${fs};color:#666">Tel: ${tel}</div>` : ''}
      </div>
      <div style="text-align:center;font-weight:800;font-size:${fsBig};border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px">
        ${type === 'ouverture' ? 'KONTRA PRÈ' : type === 'paiement' ? 'RESI PEMAN' : 'KLOTIRE PRÈ'}
      </div>
      <div style="font-size:${fs};margin-bottom:5px">
        <div style="display:flex;justify-content:space-between"><span>No. Prè:</span><b>${esc(pre.numeroPre)}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Kliyan:</span><b>${esc(pre.clientNom)}</b></div>
        ${pre.clientPhone ? `<div style="display:flex;justify-content:space-between"><span>Tel:</span><span>${esc(pre.clientPhone)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between"><span>Dat:</span><span>${fmtD(new Date())}</span></div>
      </div>
      <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:${fs}">
        <div style="display:flex;justify-content:space-between"><span>Kapital:</span><b>${fmt(pre.montant)} HTG</b></div>
        <div style="display:flex;justify-content:space-between"><span>To enterè:</span><b>${pre.tauxInteret}% / mwa</b></div>
        <div style="display:flex;justify-content:space-between"><span>Dire:</span><b>${pre.dureeEnMois} mwa</b></div>
        <div style="display:flex;justify-content:space-between"><span>Frekans:</span><b>${periodLabel(pre.periode)}</b></div>
        ${pre.garantiByens ? `<div style="display:flex;justify-content:space-between"><span>Garanti:</span><b>${esc(pre.garantiByens)}</b></div>` : ''}
        <div style="border-top:1px solid #ccc;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between">
          <b>Total dwe:</b><b style="color:#dc2626">${fmt(pre.totalDu)} HTG</b>
        </div>
        ${type === 'paiement' && paiement ? `
          <div style="border-top:2px solid #16a34a;margin-top:6px;padding-top:6px">
            <div style="text-align:center;font-weight:900;color:#16a34a;margin-bottom:4px">PEMAN ANREJISTRE</div>
            <div style="display:flex;justify-content:space-between"><span>Montan Peye:</span><b style="color:#16a34a">${fmt(paiement.montant)} HTG</b></div>
            <div style="display:flex;justify-content:space-between"><span>Total Peye:</span><b>${fmt(pre.totalPaye)} HTG</b></div>
          </div>` : ''}
      </div>
      ${echeancierHtml}
      ${type === 'ouverture' ? `
        <div style="border-top:1px dashed #aaa;margin-top:8px;padding-top:6px">
          <div style="font-size:${fs};font-weight:800;text-align:center;margin-bottom:6px">SIYATI</div>
          ${ligneSignature('Emprunteur / Kliyan')}
          ${avalizelHtml}
          ${ligneSignature('Responsab Kredi')}
        </div>` : ''}
      <div style="text-align:center;font-size:${fs};border-top:1px dashed #ccc;margin-top:8px;padding-top:5px">
        <b>Mèsi! / Merci!</b><br/><span style="color:#666">${biz}${tel ? ` — ${tel}` : ''}</span>
      </div>
    </div>`
}

export function ouvrirFenetreImpresyon(html) {
  const w = window.open('', '_blank', 'width=380,height=700')
  if (!w) { toast.error('Pemit popup pou sit sa.'); return }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
    <style>*{box-sizing:border-box}body{margin:0;background:#fff}@media print{@page{margin:0;size:auto}body{margin:0}}</style>
    </head><body>${html}</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 2500) }, 400)
}

// ═══════════════════════════════════════════════════════════════
// RESI PATAJE (Imaj PNG + PDF) — menm design ak Kanè Epay
// type: 'paiement' | 'ouverture' (kontra ak kalandriye)
// ═══════════════════════════════════════════════════════════════
const RC = { bg:'#ECE8DF', night:'#0b0c0f', gold:'#FFC83D', goldInk:'#8A6508', ink:'#14151a', muted:'#6b7080', soft:'#f4f3ef', line:'#E6E3DB', green:'#16a34a', red:'#dc2626', orange:'#d97706' }
const DISPLAY = "'Barlow Condensed','Arial Narrow',Arial,sans-serif"
const BODY    = "'Manrope','Segoe UI',Arial,sans-serif"
export const PRE_RECEIPT_WIDTH = 460

export function buildPreShareHTML({ pre, tenant, type = 'paiement', paiement = null, echeances = [] }) {
  const biz    = esc(tenant?.businessName || tenant?.name || 'PLUS GROUP')
  const bizIni = esc((tenant?.businessName || tenant?.name || 'PG').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())
  const bizRaw = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const bizSize = bizRaw.length > 26 ? 18 : bizRaw.length > 18 ? 21 : 25
  const ini    = esc((pre.clientNom || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())
  const isPay  = type === 'paiement'
  const fmtD   = (d) => d ? new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'short', year:'numeric' }) : ''
  const dateTx = isPay && paiement?.createdAt ? new Date(paiement.createdAt) : new Date()
  const dateStr = `${fmtD(dateTx)} ${String(dateTx.getHours()).padStart(2,'0')}:${String(dateTx.getMinutes()).padStart(2,'0')}`

  const totalDu   = Number(pre.totalDu || 0)
  const totalPaye = Number(pre.totalPaye || 0)
  const rete      = Math.max(0, totalDu - totalPaye)
  const pct       = totalDu > 0 ? Math.min(100, Math.round((totalPaye / totalDu) * 100)) : 0

  const row = (k, v, color = RC.ink) => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid ${RC.line}">
      <span style="font-size:13px;font-weight:600;line-height:1.3;color:${RC.muted}">${k}</span>
      <span style="font-size:13.5px;font-weight:800;line-height:1.3;color:${color};text-align:right">${v}</span>
    </div>`

  const rows = isPay ? [
    row('Kapital prè a', `${fmt(pre.montant)} HTG`),
    row('Total dwe', `${fmt(totalDu)} HTG`),
    row('Total peye', `${fmt(totalPaye)} HTG`, RC.green),
    row('Metòd', esc(String(paiement?.method || '—').toUpperCase())),
    paiement?.reference ? row('Referans', esc(paiement.reference)) : '',
  ] : [
    row('To enterè', `${esc(pre.tauxInteret)}% / mwa`),
    row('Dire', `${esc(pre.dureeEnMois)} mwa`),
    row('Frekans', esc(periodLabel(pre.periode))),
    row('Enterè total', `${fmt(totalDu - Number(pre.montant || 0))} HTG`, RC.orange),
    pre.garantiByens ? row('Garanti', esc(pre.garantiByens)) : '',
    pre.avalize1Nom ? row('Avalize 1', esc(pre.avalize1Nom)) : '',
    pre.avalize2Nom ? row('Avalize 2', esc(pre.avalize2Nom)) : '',
  ]

  const ech = !isPay && echeances.length ? `
    <div style="margin:16px 24px 0;border:1px solid ${RC.line};border-radius:16px;overflow:hidden">
      <div style="padding:10px 14px;background:${RC.soft};font-family:${DISPLAY};font-weight:800;font-size:16px;line-height:1.25;letter-spacing:.06em">KALANDRIYE · ${echeances.length} PEMAN</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="color:${RC.muted};font-size:10.5px;font-weight:800;letter-spacing:.06em">
          <td style="padding:7px 14px">#</td><td style="padding:7px 4px">DAT</td><td style="padding:7px 14px;text-align:right">MONTAN</td>
        </tr>
        ${echeances.map(e => `<tr style="border-top:1px solid ${RC.line}">
          <td style="padding:6px 14px;font-weight:800">${esc(e.numero)}</td>
          <td style="padding:6px 4px;font-weight:600">${fmtD(e.dat_limit || e.datLimit)}</td>
          <td style="padding:6px 14px;text-align:right;font-weight:800">${fmt(e.montant_total || e.montantTotal)}</td>
        </tr>`).join('')}
      </table>
    </div>` : ''

  const logo = tenant?.logoUrl
    ? `<img src="${esc(tenant.logoUrl)}" crossorigin="anonymous" style="width:50px;height:50px;border-radius:15px;object-fit:cover;background:#fff;display:block;flex:none"/>`
    : `<div style="width:50px;height:50px;border-radius:15px;background:${RC.gold};display:flex;align-items:center;justify-content:center;flex:none"><span style="font-family:${DISPLAY};font-weight:800;font-size:22px;line-height:1.25;color:${RC.night}">${bizIni}</span></div>`

  const big = isPay
    ? { l: 'MONTAN PEYE', v: `+${fmt(paiement?.montant)}`, c: '#5ee59a', pill: 'PEMAN', pbg: '#4ade80' }
    : { l: 'KAPITAL PRÈ', v: fmt(pre.montant), c: RC.gold, pill: 'KONTRA', pbg: RC.gold }

  return `
<div style="width:${PRE_RECEIPT_WIDTH}px;padding:22px;background:${RC.bg};font-family:${BODY};color:${RC.ink};box-sizing:border-box;line-height:1.25;text-align:left">
  <div style="border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 24px 40px -24px rgba(11,12,15,.45)">
    <div style="position:relative;overflow:hidden;background:${RC.night};padding:16px 24px 24px;color:#f2f1ec">
      <div style="position:absolute;width:340px;height:340px;right:-120px;top:-170px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.32),rgba(255,200,61,0) 65%)"></div>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,.1)">
        <span style="font-size:13px;font-weight:800;line-height:1.25;color:#fff;letter-spacing:.02em">${dateStr}</span>
        <span style="font-size:11px;font-weight:800;line-height:1.25;letter-spacing:.14em;color:rgba(242,241,236,.6)">${isPay ? 'RESI' : 'KONTRA'} ${isPay && paiement?.id ? `#${esc(String(paiement.id).slice(-8).toUpperCase())}` : esc(pre.numeroPre)}</span>
      </div>
      <div style="position:relative;display:flex;align-items:center;gap:12px">
        ${logo}
        <div style="min-width:0;flex:1">
          <div style="font-family:${DISPLAY};font-weight:800;font-size:${bizSize}px;line-height:1.25;text-transform:uppercase;letter-spacing:.02em;color:#fff;word-break:break-word">${biz}</div>
          <div style="font-size:10.5px;font-weight:800;line-height:1.25;letter-spacing:.14em;color:rgba(242,241,236,.55);margin-top:2px">MIKWO KREDI${tenant?.phone ? ` · ${esc(tenant.phone)}` : ''}</div>
        </div>
        <div style="height:32px;padding:0 13px;border-radius:999px;background:${big.pbg};display:flex;align-items:center;flex:none">
          <span style="font-family:${DISPLAY};font-weight:800;font-size:15px;line-height:1.25;letter-spacing:.08em;color:${RC.night}">${big.pill}</span>
        </div>
      </div>
      <div style="position:relative;margin-top:22px;font-size:11px;font-weight:800;line-height:1.25;letter-spacing:.14em;color:rgba(242,241,236,.6)">${big.l}</div>
      <div style="position:relative;margin-top:2px;white-space:nowrap">
        <span style="font-family:${DISPLAY};font-weight:800;font-size:64px;line-height:1.15;color:${big.c}">${big.v}</span><span style="font-family:${DISPLAY};font-weight:800;font-size:22px;line-height:1.15;color:rgba(242,241,236,.55);margin-left:8px;letter-spacing:.05em">HTG</span>
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
          <span style="font-family:${DISPLAY};font-weight:800;font-size:20px;line-height:1.25;color:${RC.gold}">${ini}</span>
        </div>
        <div style="min-width:0;flex:1">
          <div style="font-weight:800;font-size:16px;line-height:1.25;word-break:break-word">${esc(pre.clientNom)}</div>
          <div style="font-family:${DISPLAY};font-weight:700;font-size:16px;line-height:1.25;letter-spacing:.08em;color:${RC.goldInk};margin-top:1px">${esc(pre.numeroPre)}</div>
        </div>
        ${pre.clientPhone ? `<div style="text-align:right;font-size:11.5px;font-weight:600;line-height:1.5;color:${RC.muted};flex:none">${esc(pre.clientPhone)}</div>` : ''}
      </div>
    </div>

    <div style="padding:8px 24px 0">${rows.join('')}</div>

    ${isPay ? `
    <div style="margin:16px 24px 0;padding:16px 18px;border-radius:18px;background:${RC.night};color:#f2f1ec">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <span style="font-size:11px;font-weight:800;line-height:1.25;letter-spacing:.14em;color:rgba(242,241,236,.6)">RETE POU PEYE</span>
        <span style="white-space:nowrap"><span style="font-family:${DISPLAY};font-weight:800;font-size:34px;line-height:1.2;color:${rete > 0 ? RC.gold : '#5ee59a'}">${rete > 0 ? fmt(rete) : 'KONPLÈ'}</span>${rete > 0 ? `<span style="font-family:${DISPLAY};font-weight:800;font-size:14px;line-height:1.2;color:rgba(242,241,236,.55);margin-left:6px">HTG</span>` : ''}</span>
      </div>
      <div style="height:7px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:12px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${RC.gold};border-radius:99px"></div></div>
      <div style="font-size:11.5px;font-weight:700;line-height:1.25;color:rgba(242,241,236,.6);margin-top:7px">${pct}% prè a peye</div>
    </div>` : `
    <div style="margin:16px 24px 0;padding:16px 18px;border-radius:18px;background:${RC.night};display:flex;justify-content:space-between;align-items:center;gap:10px">
      <span style="font-size:11px;font-weight:800;line-height:1.25;letter-spacing:.14em;color:rgba(242,241,236,.6)">TOTAL POU REMÈT</span>
      <span style="white-space:nowrap"><span style="font-family:${DISPLAY};font-weight:800;font-size:34px;line-height:1.2;color:${RC.gold}">${fmt(totalDu)}</span><span style="font-family:${DISPLAY};font-weight:800;font-size:14px;line-height:1.2;color:rgba(242,241,236,.55);margin-left:6px">HTG</span></span>
    </div>`}
    ${ech}

    <div style="display:flex;justify-content:center;padding:18px 24px 0">
      <div style="height:34px;padding:0 15px;border-radius:999px;background:rgba(22,163,74,.1);display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${RC.green}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        <span style="font-size:12px;font-weight:800;line-height:1.25;letter-spacing:.04em;color:${RC.green}">${isPay ? 'PEMAN ANREJISTRE' : 'KONTRA PRÈ'}</span>
      </div>
    </div>
    <div style="text-align:center;padding:16px 26px 22px">
      ${tenant?.receiptFooterNote ? `<div style="font-size:12px;color:${RC.muted};font-weight:600;margin-bottom:8px;line-height:1.45">${esc(tenant.receiptFooterNote)}</div>` : ''}
      <div style="font-family:${DISPLAY};font-weight:800;font-size:22px;line-height:1.25;letter-spacing:.04em;text-transform:uppercase;color:${RC.ink}">Mèsi! / Merci!</div>
      <div style="font-size:11px;font-weight:700;line-height:1.25;color:${RC.muted};margin-top:4px">Produit par PLUS GROUP · Tel: +509 4244 9024</div>
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

async function renderHtmlCanvas(html) {
  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;'
  box.innerHTML = html
  document.body.appendChild(box)
  try {
    try {
      await Promise.all([
        document.fonts?.load?.(`800 60px "Barlow Condensed"`),
        document.fonts?.load?.(`700 14px "Manrope"`),
        document.fonts?.load?.(`800 14px "Manrope"`),
      ])
      await document.fonts?.ready
    } catch { /* offline: polis sistèm */ }
    const imgs = Array.from(box.querySelectorAll('img'))
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })))
    return await captureNode(box.firstElementChild, RC.bg)
  } finally {
    document.body.removeChild(box)
  }
}

const fileSafe = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')

export async function sharePreReceipt({ pre, tenant, type = 'paiement', paiement = null, echeances = [] }, fmtOut = 'png') {
  const canvas = await renderHtmlCanvas(buildPreShareHTML({ pre, tenant, type, paiement, echeances }))
  const isPng  = fmtOut === 'png'
  let blob
  if (isPng) {
    blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
  } else {
    const wMm = 100, hMm = (canvas.height * wMm) / canvas.width
    const pdf = new jsPDF({ unit: 'mm', format: [wMm, Math.max(hMm, 60)] })
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, wMm, hMm)
    blob = pdf.output('blob')
  }
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`
  const fileName = `Pre-${fileSafe(pre.numeroPre)}-${type === 'paiement' ? 'Peman' : 'Kontra'}-${stamp}.${isPng ? 'png' : 'pdf'}`
  const file = new File([blob], fileName, { type: isPng ? 'image/png' : 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Resi Prè — ${pre.numeroPre}`, text: `${pre.clientNom} — ${pre.numeroPre}` })
      return true
    } catch (e) { if (e?.name === 'AbortError') return false }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return true
}

export function usePreShare() {
  const [generating, setGenerating] = useState(false)
  const share = useCallback(async (data, fmtOut = 'png') => {
    setGenerating(fmtOut)
    try {
      const ok = await sharePreReceipt(data, fmtOut)
      if (ok) toast.success(fmtOut === 'png' ? 'Imaj resi a pare!' : 'PDF la pare!')
      return ok
    } catch { toast.error('Erè pandan kreyasyon resi a.'); return false }
    finally { setGenerating(false) }
  }, [])
  return { generating, share }
}

// ═══════════════════════════════════════════════════════════════
export function usePrinter() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)
  const [largeur,    setLargeur]    = useState(80)

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

  const printPre = useCallback(async ({ pre, echeances = [], tenant, type = 'ouverture', paiement = null }) => {
    if (isPrinterConnected()) {
      setPrinting(true)
      try { await printPreReceipt(pre, echeances, tenant, type, paiement, largeur); toast.success('Resi enprime! 🖨️'); return true }
      catch (err) { setConnected(false); toast.error('Erè printer: ' + (err.message || '')); return false }
      finally { setPrinting(false) }
    }
    ouvrirFenetreImpresyon(genHtmlResi({ pre, echeances, tenant, type, paiement, largeur }))
    return true
  }, [largeur])

  return { connected, connecting, printing, connect, disconnect, printPre, largeur, setLargeur }
}