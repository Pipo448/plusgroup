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
  print: async (invoice, tenant, cashier = null, amountGiven = 0, change = 0) => {
    if (!isPrinterConnected()) {
      toast.error('Konekte printer dabò!')
      set({ connected: false })
      return false
    }
    set({ printing: true })
    try {
      await printInvoice(invoice, tenant, cashier, amountGiven, change)
      toast.success('Resi enprime! 🖨️')
      return true
    } catch (err) {
      console.error('Print error:', err)
      set({ connected: false })
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      set({ printing: false })
    }
  },

  // ── PRINT SABOTAY ────────────────────────────────────────
  printSabotay: async (plan, member, paidDates = [], tenant, type = 'peman') => {
    if (!isPrinterConnected()) {
      toast.error('Konekte printer dabò!')
      set({ connected: false })
      return false
    }
    set({ printing: true })
    try {
      await printSabotayReceipt(plan, member, paidDates, tenant, type)
      toast.success('Resi Sabotay enprime! 🖨️')
      return true
    } catch (err) {
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
    if (!isPrinterConnected()) {
      toast.error('Konekte printer dabò!')
      set({ connected: false })
      return false
    }
    set({ printing: true })
    try {
      await printKaneReceipt(account, transaction, tenant, type)
      toast.success('Resi Kane enprime! 🖨️')
      return true
    } catch (err) {
      console.error('Print kane error:', err)
      set({ connected: false })
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      set({ printing: false })
    }
  },
}))