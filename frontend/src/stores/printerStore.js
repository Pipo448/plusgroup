// src/stores/printerStore.js
import { create } from 'zustand'
import {
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  printInvoice,
  printSabotayReceipt,
  printKaneReceipt,
  isAndroid,
} from '../services/printerService'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
// BROWSER PRINT FALLBACK — pou Android san BLE printer
// ─────────────────────────────────────────────────────────────
function browserPrint(html) {
  const w = window.open('', '_blank', 'width=400,height=700')
  if (!w) {
    toast.error('Pemit popup pou sit sa pou ka enprime.')
    return false
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { box-sizing: border-box }
      body { margin: 0; padding: 8px; font-family: 'Courier New', monospace; font-size: 11px; background: #fff; color: #000 }
      @media print { @page { margin: 0; size: 80mm auto } body { margin: 0; padding: 0 } }
    </style></head><body>${html}</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 2000) }, 300)
  return true
}

// ─────────────────────────────────────────────────────────────
// HTML BUILDERS — pou fallback browser print
// ─────────────────────────────────────────────────────────────
function buildInvoiceHtml(invoice, tenant, cashier) {
  const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  const biz = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const snap = invoice.clientSnapshot || {}
  const totalHtg = Number(invoice.totalHtg || 0)
  const paidHtg = Number(invoice.amountPaidHtg || 0)
  const balanceHtg = Number(invoice.balanceDueHtg || 0)
  const lastPay = invoice.payments?.length > 0 ? invoice.payments[invoice.payments.length - 1] : null
  const change = Number(lastPay?.change || 0)
  const amountGiven = Number(lastPay?.amountGiven || 0)
  const isPaid = invoice.status === 'paid'
  const isCredit = balanceHtg > 0
  const statusLine = isPaid ? 'TOTAL PEYE ✅' : isCredit ? '*** KREDI ***' : 'IMPAYE'
  const METOD = { cash:'Kach', moncash:'MonCash', natcash:'NatCash', card:'Kat kredi', transfer:'Virement', credit:'Kredi', other:'Lot' }
  const dateStr = new Date(invoice.issueDate || Date.now()).toLocaleDateString('fr-HT')
  const cashierName = cashier?.fullName || cashier?.name || ''

  const itemsHtml = (invoice.items || []).map(item => {
    const nom = item.product?.name || item.productSnapshot?.name || 'Atik'
    const qty = Number(item.quantity)
    const pri = fmt(item.unitPriceHtg)
    const tot = fmt(item.totalHtg)
    return `<tr><td style="width:50%">${nom}</td><td style="text-align:center">${qty}</td><td style="text-align:right">${pri}</td><td style="text-align:right">${tot}</td></tr>`
  }).join('')

  return `
    <div style="width:100%;max-width:300px;margin:0 auto;font-size:11px">
      <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:6px">
        ${tenant?.logoUrl ? `<img src="${tenant.logoUrl}" style="height:40px;display:block;margin:0 auto 4px">` : ''}
        <strong style="font-size:14px">${biz}</strong><br>
        ${tenant?.address ? `<span style="font-size:9px">${tenant.address}</span><br>` : ''}
        ${tenant?.phone ? `<span style="font-size:9px">Tel: ${tenant.phone}</span>` : ''}
      </div>
      <div style="font-size:10px;margin-bottom:6px">
        <div>Dat: ${dateStr} | Resi: ${invoice.invoiceNumber}</div>
        ${snap.name ? `<div>Kliyan: ${snap.name}</div>` : ''}
        ${snap.phone ? `<div>Tel: ${snap.phone}</div>` : ''}
        ${cashierName ? `<div>Kesye: ${cashierName}</div>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px">
        <thead><tr style="border-bottom:1px solid #000">
          <th style="text-align:left">Pwodwi</th><th>Q</th><th style="text-align:right">Pri</th><th style="text-align:right">Tot</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="border-top:1px solid #000;padding-top:4px">
        ${Number(invoice.discountHtg) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Remiz:</span><span>-${fmt(invoice.discountHtg)} G</span></div>` : ''}
        ${Number(invoice.taxHtg) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Taks:</span><span>${fmt(invoice.taxHtg)} G</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;margin-top:4px">
          <span>TOTAL:</span><span>${fmt(totalHtg)} G</span>
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px;font-size:10px">
        ${amountGiven > 0 ? `<div style="display:flex;justify-content:space-between"><span>Kòb bay:</span><span>${fmt(amountGiven)} G</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:bold"><span>Kòb resevwa:</span><span>${fmt(paidHtg || totalHtg)} G</span></div>
        ${change > 0 ? `<div style="display:flex;justify-content:space-between"><span>Monnen:</span><span>${fmt(change)} G</span></div>` : ''}
        ${lastPay?.method ? `<div>Metod: ${METOD[lastPay.method] || lastPay.method}</div>` : ''}
      </div>
      ${balanceHtg > 0 ? `
        <div style="border-top:1px solid #000;margin-top:4px;padding-top:4px">
          <div style="display:flex;justify-content:space-between;color:red;font-weight:bold">
            <span>Balans di:</span><span>${fmt(balanceHtg)} G</span>
          </div>
        </div>` : ''}
      <div style="text-align:center;border-top:2px solid #000;margin-top:6px;padding-top:6px;font-weight:bold;font-size:13px">
        ${statusLine}
      </div>
      <div style="text-align:center;margin-top:8px;font-size:9px;border-top:1px dashed #000;padding-top:4px">
        Mesi paske ou achte lakay nou!<br>
        PlusGroup — +509 4244-9024
      </div>
    </div>`
}

function buildSabotayHtml(plan, member, paidDates, tenant, type, allSlots = []) {
  const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })
  const biz = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const txDate = new Date().toLocaleDateString('fr-HT') + ' ' + new Date().toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })
  const activeMemberCount = plan.activeMemberCount || plan.maxMembers || 0
  const payout = (plan.amount * activeMemberCount) - (plan.feePerMember || plan.fee || 0)
  const FREQ = { daily:'Chak Jou', weekly_saturday:'Chak Samdi', weekly_monday:'Chak Lendi', biweekly:'Chak 15 Jou', monthly:'Chak Mwa', weekdays:'Lendi-Vandredi' }
  const titleMap = { peman:'RESI PEMAN', tiraj:'RESI TIRAJ AVÈG', kanpe:'KANPE PATISIPASYON', kont:'KONT MANM KREYE' }

  // ✅ slotCount ak pozisyon yo
  const slotCount = allSlots.length > 0 ? allSlots.length : 1
  const posLabel  = allSlots.length > 1
    ? allSlots.map(s => '#' + s.position).join(' • ')
    : '#' + member.position

  // ✅ amtPaid — sòme tout men ki deja peye
  const totalPaid = allSlots.length > 1
    ? allSlots.reduce((acc, slot) =>
        acc + Object.keys(slot.payments || {}).filter(d => slot.payments[d]).length, 0)
    : Object.keys(member.payments || {}).filter(d => member.payments[d]).length
  const amtPaid  = totalPaid * plan.amount

  // ✅ Total peman jodi a × kantite men
  const totalAmt = paidDates.length * plan.amount * slotCount

  // ✅ Kontribisyon kimilatif
  const kontribisyonTotal = amtPaid + totalAmt

  return `
    <div style="width:100%;max-width:300px;margin:0 auto;font-size:11px">
      <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:6px">
        ${tenant?.logoUrl ? `<img src="${tenant.logoUrl}" style="height:40px;display:block;margin:0 auto 4px">` : ''}
        <strong style="font-size:14px">${biz}</strong><br>
        <strong>-- SABOTAY SOL --</strong><br>
        ${tenant?.phone ? `<span style="font-size:9px">Tel: ${tenant.phone}</span>` : ''}
      </div>
      <div style="text-align:center;font-weight:bold;font-size:13px;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:6px">
        ${titleMap[type] || 'RESI'}
      </div>
      <div style="font-size:10px;margin-bottom:6px">
        <div>Plan: ${plan.name}</div>
        <div>Dat: ${txDate}</div>
        <div>Frekans: ${FREQ[plan.frequency] || plan.frequency}</div>
      </div>
      <div style="border-top:1px dashed #000;padding-top:4px;margin-bottom:6px">
        <strong>${member.name}</strong><br>
        ${member.phone ? `<span style="font-size:10px">Tel: ${member.phone}</span><br>` : ''}
        <span style="font-size:10px">Pozisyon: ${posLabel}</span><br>
        ${slotCount > 1 ? `<span style="font-size:10px;font-weight:bold">${slotCount} Men • ${fmt(plan.amount * slotCount)} G/sik</span>` : ''}
      </div>
      ${type === 'peman' ? `
        <div style="font-size:10px;margin-bottom:6px">
          <strong>Dat Peye:</strong>
          ${paidDates.map(d => `
            <div style="display:flex;justify-content:space-between">
              <span>${d.split('-').reverse().join('/')}</span>
              <span>${slotCount > 1
                ? `${slotCount}×${fmt(plan.amount)}=+${fmt(plan.amount * slotCount)}`
                : `+${fmt(plan.amount)}`
              } G</span>
            </div>`).join('')}
        </div>
        <div style="text-align:center;font-weight:bold;font-size:13px;border-top:1px solid #000;padding-top:6px">
          TOTAL PEYE: ${fmt(totalAmt)} G
        </div>
        <div style="font-size:10px;margin-top:4px">
          Kontribisyon total: ${fmt(kontribisyonTotal)} G
        </div>
      ` : type === 'tiraj' ? `
        <div style="text-align:center;padding:8px 0">
          <div style="font-size:10px">Moun Chwazi pa Tiraj:</div>
          <strong style="font-size:15px">${member.name}</strong>
          <div style="font-size:10px">Pozisyon #${member.position}</div>
          <div style="font-weight:bold;font-size:14px;color:green;margin-top:6px">PRIM SOL: ${fmt(payout)} G</div>
        </div>
      ` : type === 'kanpe' ? `
        <div style="text-align:center;padding:8px 0;color:orange;font-weight:bold">
          Manm sa a kanpe nan sol la.
        </div>
      ` : `
        <div style="font-size:10px">
          <div>Montan / Peman: ${fmt(plan.amount)} G</div>
          <div>Peman Fèt: ${totalPaid}/${activeMemberCount}</div>
          <div>Total Kontribye: ${fmt(amtPaid)} G</div>
        </div>
        <div style="text-align:center;font-weight:bold;font-size:14px;margin-top:6px">PRIM SOL: ${fmt(payout)} G</div>
      `}
      <div style="text-align:center;margin-top:8px;font-size:9px;border-top:1px dashed #000;padding-top:4px">
        Mesi! / Merci!<br>PlusGroup — +50942449024
      </div>
    </div>`
}

function buildKaneHtml(account, transaction, tenant, type) {
  const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  const biz = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const TX_LABELS = { ouverture:'OUVETI KONT', depot:'DEPO', retrait:'RETRE' }
  const METOD = { cash:'Kach', moncash:'MonCash', natcash:'NatCash', card:'Kat kredi', transfer:'Virement', credit:'Kredi', other:'Lot' }
  const txDate = transaction?.createdAt
    ? new Date(transaction.createdAt).toLocaleDateString('fr-HT')
    : new Date().toLocaleDateString('fr-HT')

  return `
    <div style="width:100%;max-width:300px;margin:0 auto;font-size:11px">
      <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:6px">
        ${tenant?.logoUrl ? `<img src="${tenant.logoUrl}" style="height:40px;display:block;margin:0 auto 4px">` : ''}
        <strong style="font-size:14px">${biz}</strong><br>
        <strong>-- KANÈ EPAY --</strong>
      </div>
      <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:6px">
        ${TX_LABELS[type] || 'TRANZAKSYON'}
      </div>
      <div style="font-size:10px;margin-bottom:6px">
        <div>No. Kont: ${account.accountNumber || ''}</div>
        <div>Dat: ${txDate}</div>
      </div>
      <div style="border-top:1px dashed #000;padding-top:4px;margin-bottom:6px">
        <strong>${account.firstName} ${account.lastName}</strong><br>
        ${account.phone ? `<span style="font-size:10px">Tel: ${account.phone}</span><br>` : ''}
        ${account.nifOrCin ? `<span style="font-size:10px">NIF/CIN: ${account.nifOrCin}</span>` : ''}
      </div>
      <div style="border-top:1px solid #000;padding-top:4px">
        ${type === 'ouverture' ? `
          <div style="display:flex;justify-content:space-between"><span>Montan depoze:</span><span>${fmt(account.openingAmount)} G</span></div>
          <div style="display:flex;justify-content:space-between"><span>Frè kanè:</span><span>-${fmt(account.kaneFee || 0)} G</span></div>
        ` : `
          <div style="display:flex;justify-content:space-between"><span>Balans anvan:</span><span>${fmt(transaction?.balanceBefore)} G</span></div>
        `}
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;margin-top:4px">
          <span>${type === 'ouverture' ? 'BALANS:' : type === 'retrait' ? 'RETRE:' : 'DEPO:'}</span>
          <span>${fmt(type === 'ouverture' ? account.balance : transaction?.amount)} G</span>
        </div>
        ${type !== 'ouverture' ? `<div style="display:flex;justify-content:space-between"><span>Nouvo balans:</span><span>${fmt(transaction?.balanceAfter)} G</span></div>` : ''}
        ${transaction?.method ? `<div>Metod: ${METOD[transaction.method] || transaction.method}</div>` : ''}
      </div>
      <div style="text-align:center;margin-top:8px;font-size:9px;border-top:1px dashed #000;padding-top:4px">
        Mesi!<br>PlusGroup — +50942449024
      </div>
    </div>`
}

// ─────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────
export const usePrinterStore = create((set, get) => ({

  connected:  isPrinterConnected(),
  connecting: false,
  printing:   false,
  deviceName: null,

  // ── KONEKTE ─────────────────────────────────────────────
  connect: async () => {
    const { connecting, connected } = get()
    if (connecting || connected) return

    set({ connecting: true })
    try {
      const name = await connectPrinter()
      set({ connected: true, deviceName: name })
      toast.success(`Printer konekte: ${name} 🖨️`)
    } catch (err) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) return
      if (err.message === 'WEB_BLUETOOTH_NOT_SUPPORTED') {
        toast.error('Bluetooth pa sipote. Itilize Chrome sou Android oswa PC.', { duration: 6000 })
        return
      }
      if (err.message === 'PRINTER_UUID_NOT_FOUND') {
        toast.error('Printer konekte men li pa rekonèt. Asire se yon ESC/POS printer.', { duration: 5000 })
        return
      }
      toast.error('Pa ka konekte printer. Verifye Bluetooth aktive epi printer a allume.')
    } finally {
      set({ connecting: false })
    }
  },

  // ── DEKONEKTE ────────────────────────────────────────────
  disconnect: () => {
    disconnectPrinter()
    set({ connected: false, deviceName: null })
    toast('Printer dekonekte', { icon: '🔌' })
  },

  // ── PRINT INVOICE ────────────────────────────────────────
  print: async (invoice, tenant, cashier = null) => {
    set({ printing: true })
    try {
      await printInvoice(invoice, tenant, cashier)
      toast.success('Resi enprime! 🖨️')
      return true
    } catch (err) {
      if (err.message === 'ANDROID_USE_BROWSER_PRINT' || !isPrinterConnected()) {
        // Fallback: browser print
        const html = buildInvoiceHtml(invoice, tenant, cashier)
        return browserPrint(html)
      }
      console.error('Print error:', err)
      set({ connected: false })
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      set({ printing: false })
    }
  },

 // ── PRINT SABOTAY ────────────────────────────────────────
  printSabotay: async (plan, member, paidDates = [], tenant, type = 'peman', allSlots = []) => {
    set({ printing: true })
    try {
      await printSabotayReceipt(plan, member, paidDates, tenant, type, allSlots)
      toast.success('Resi Sabotay enprime! 🖨️')
      return true
    } catch (err) {
      if (err.message === 'ANDROID_USE_BROWSER_PRINT' || !isPrinterConnected()) {
        const html = buildSabotayHtml(plan, member, paidDates, tenant, type, allSlots)
        return browserPrint(html)
      }
      console.error('Print sabotay error:', err)
      set({ connected: false })
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      set({ printing: false })
    }
  },

  // ── PRINT KANÈ ───────────────────────────────────────────
  printKane: async (account, transaction, tenant, type = 'ouverture') => {
    set({ printing: true })
    try {
      await printKaneReceipt(account, transaction, tenant, type)
      toast.success('Resi Kane enprime! 🖨️')
      return true
    } catch (err) {
      if (err.message === 'ANDROID_USE_BROWSER_PRINT' || !isPrinterConnected()) {
        const html = buildKaneHtml(account, transaction, tenant, type)
        return browserPrint(html)
      }
      console.error('Print kane error:', err)
      set({ connected: false })
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      set({ printing: false })
    }
  },
}))