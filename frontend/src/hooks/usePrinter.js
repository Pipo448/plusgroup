// src/hooks/usePrinter.js
import { useState, useCallback } from 'react'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printInvoice } from '../services/printerService'
import toast from 'react-hot-toast'

export const usePrinter = () => {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const name = await connectPrinter()
      setConnected(true)
      toast.success(`Printer konekte: ${name}`)
    } catch (err) {
      // Itilizatè te anile seleksyon — pa montre erè
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) return

      // Bluetooth pa sipote nan browser sa (Windows Chrome san flag)
      if (err.message === 'WEB_BLUETOOTH_NOT_SUPPORTED') {
        toast.error(
          'Bluetooth pa sipote nan browser sa. Itilize Chrome sou Android, oswa aktive flag Bluetooth nan Chrome Windows.',
          { duration: 6000 }
        )
        return
      }

      // Printer konekte men UUID pa rekonèt
      if (err.message === 'PRINTER_UUID_NOT_FOUND') {
        toast.error(
          'Printer konekte men li pa rekonèt. Asire se yon ESC/POS thermal printer.',
          { duration: 5000 }
        )
        return
      }

      // Lòt erè jeneral
      toast.error('Pa ka konekte printer. Asire Bluetooth aktive epi printer a allume.')
    } finally {
      setConnecting(false)
    }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter()
    setConnected(false)
    toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  const print = useCallback(async (invoice, tenant, cashier = null) => {
    if (!isPrinterConnected()) {
      toast.error('Konekte printer dabò!')
      setConnected(false)
      return false
    }
    setPrinting(true)
    try {
      await printInvoice(invoice, tenant, cashier)
      toast.success('Resi enprime!')
      return true
    } catch (err) {
      console.error('Print error:', err)
      setConnected(false)
      toast.error('Erè enprimant. Eseye konekte ankò.')
      return false
    } finally {
      setPrinting(false)
    }
  }, [])

  return { connected, connecting, printing, connect, disconnect, print }
}
