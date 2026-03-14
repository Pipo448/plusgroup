// src/hooks/usePrinter.js
import { useState, useCallback } from 'react'
import {
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  printInvoice,
  printSabotayReceipt,
  printKaneReceipt,
} from '../services/printerService'
import toast from 'react-hot-toast'
import { usePrinterStore } from '../stores/printerStore'

export const usePrinter = () => {
  const store = usePrinterStore()
  return {
    connected:   store.connected,
    connecting:  store.connecting,
    printing:    store.printing,
    connect:     store.connect,
    disconnect:  store.disconnect,
    print:       store.print,
    printSabotay: store.printSabotay,
    printKane:   store.printKane,
  }
}

  // ── KONEKSYON ──────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const name = await connectPrinter()
      setConnected(true)
      toast.success(`Printer konekte: ${name}`)
    } catch (err) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) return

      if (err.message === 'WEB_BLUETOOTH_NOT_SUPPORTED') {
        toast.error(
          'Bluetooth pa sipote nan browser sa. Itilize Chrome sou Android, oswa aktive flag Bluetooth nan Chrome Windows.',
          { duration: 6000 }
        )
        return
      }

      if (err.message === 'PRINTER_UUID_NOT_FOUND') {
        toast.error(
          'Printer konekte men li pa rekonèt. Asire se yon ESC/POS thermal printer.',
          { duration: 5000 }
        )
        return
      }

      toast.error('Pa ka konekte printer. Asire Bluetooth aktive epi printer a allume.')
    } finally {
      setConnecting(false)
    }
  }, [connecting, connected])

  // ── DEKONEKSYON ────────────────────────────────────────────
  const disconnect = useCallback(() => {
    disconnectPrinter()
    setConnected(false)
    toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  // ── HELPER: verifye koneksyon ──────────────────────────────
  const checkConnected = useCallback(() => {
    if (!isPrinterConnected()) {
      toast.error('Konekte printer dabò!')
      setConnected(false)
      return false
    }
    return true
  }, [])

  // ── PRINT INVOICE ✅ + amountGiven + change ────────────────
  const print = useCallback(async (
    invoice,
    tenant,
    cashier      = null,
    amountGiven  = 0,   // ✅ kob kliyan bay
    change       = 0    // ✅ monnen rann
  ) => {
    if (!checkConnected()) return false
    setPrinting(true)
    try {
      await printInvoice(invoice, tenant, cashier, amountGiven, change)
      toast.success('Resi enprime! 🖨️')
      return true
    } catch (err) {
      console.error('Print invoice error:', err)
      setConnected(false)
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      setPrinting(false)
    }
  }, [checkConnected])

  // ── PRINT SABOTAY SOL ✅ ───────────────────────────────────
  const printSabotay = useCallback(async (
    plan,
    member,
    paidDates = [],
    tenant,
    type = 'peman'   // 'peman' | 'kont'
  ) => {
    if (!checkConnected()) return false
    setPrinting(true)
    try {
      await printSabotayReceipt(plan, member, paidDates, tenant, type)
      toast.success('Resi Sabotay enprime! 🖨️')
      return true
    } catch (err) {
      console.error('Print sabotay error:', err)
      setConnected(false)
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      setPrinting(false)
    }
  }, [checkConnected])

  // ── PRINT KANÈ EPAY ✅ ─────────────────────────────────────
  const printKane = useCallback(async (
    account,
    transaction,
    tenant,
    type = 'ouverture'  // 'ouverture' | 'depot' | 'retrait'
  ) => {
    if (!checkConnected()) return false
    setPrinting(true)
    try {
      await printKaneReceipt(account, transaction, tenant, type)
      toast.success('Resi Kanè enprime! 🖨️')
      return true
    } catch (err) {
      console.error('Print kane error:', err)
      setConnected(false)
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      setPrinting(false)
    }
  }, [checkConnected])

  return {
    connected,
    connecting,
    printing,
    connect,
    disconnect,
    print,         // Fakti / Invoice
    printSabotay,  // Sabotay Sol
    printKane,     // Kanè Epay
  }
}
