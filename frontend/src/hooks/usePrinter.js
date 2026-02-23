// src/hooks/usePrinter.js
import { useState, useCallback } from 'react'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printInvoice } from '../services/printerService'
import toast from 'react-hot-toast'

export const usePrinter = () => {
  const [connected, setConnected]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [printing, setPrinting]     = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const name = await connectPrinter()
      setConnected(true)
      toast.success(`✅ Konekte: ${name}`)
    } catch (err) {
      if (err.name !== 'NotFoundError') { // user cancel
        toast.error('Pa ka konekte printer. Asire Bluetooth aktive.')
      }
    } finally {
      setConnecting(false)
    }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter()
    setConnected(false)
    toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  const print = useCallback(async (invoice, tenant) => {
    if (!isPrinterConnected()) {
      toast.error('Konekte printer dabò!')
      return false
    }
    setPrinting(true)
    try {
      await printInvoice(invoice, tenant)
      toast.success('Resi enprime!')
      return true
    } catch (err) {
      setConnected(false)
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      setPrinting(false)
    }
  }, [])

  return { connected, connecting, printing, connect, disconnect, print }
}
