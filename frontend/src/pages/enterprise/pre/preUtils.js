// src/pages/enterprise/pre/preUtils.js — Enpresyon + Helpers
import { PERIODES } from './preConstants'
import { fmt }      from '../kaneShared.jsx'
import toast        from 'react-hot-toast'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printPreReceipt } from '../../../services/printerService'
import { useState, useCallback } from 'react'

export function genHtmlResi({ pre, echeances = [], tenant, type = 'ouverture', paiement = null, largeur = 80 }) {
  const biz   = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const tel   = tenant?.phone || ''
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
    if (pre.avalize1Nom) avalizelHtml += ligneSignature(`Avalize 1: ${pre.avalize1Nom}`)
    if (pre.avalize2Nom) avalizelHtml += ligneSignature(`Avalize 2: ${pre.avalize2Nom}`)
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
        <div style="display:flex;justify-content:space-between"><span>No. Prè:</span><b>${pre.numeroPre||''}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Kliyan:</span><b>${pre.clientNom||''}</b></div>
        ${pre.clientPhone ? `<div style="display:flex;justify-content:space-between"><span>Tel:</span><span>${pre.clientPhone}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between"><span>Dat:</span><span>${fmtD(new Date())}</span></div>
      </div>
      <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:${fs}">
        <div style="display:flex;justify-content:space-between"><span>Kapital:</span><b>${fmt(pre.montant)} HTG</b></div>
        <div style="display:flex;justify-content:space-between"><span>To enterè:</span><b>${pre.tauxInteret}% / mwa</b></div>
        <div style="display:flex;justify-content:space-between"><span>Dire:</span><b>${pre.dureeEnMois} mwa</b></div>
        <div style="display:flex;justify-content:space-between"><span>Frekans:</span><b>${PERIODES.find(p=>p.value===pre.periode)?.label||pre.periode}</b></div>
        ${pre.garantiByens ? `<div style="display:flex;justify-content:space-between"><span>Garanti:</span><b>${pre.garantiByens}</b></div>` : ''}
        <div style="border-top:1px solid #ccc;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between">
          <b>Total dwe:</b><b style="color:#dc2626">${fmt(pre.totalDu)} HTG</b>
        </div>
        ${type === 'paiement' && paiement ? `
          <div style="border-top:2px solid #16a34a;margin-top:6px;padding-top:6px">
            <div style="text-align:center;font-weight:900;color:#16a34a;margin-bottom:4px">✅ PEMAN ANREJISTRE</div>
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
