// src/hooks/usePrinter.js
// ✅ Thin wrapper sou printerStore — tout lojik nan store a
import { usePrinterStore } from '../stores/printerStore'

export const usePrinter = () => {
  const store = usePrinterStore()
  return {
    connected:    store.connected,
    connecting:   store.connecting,
    printing:     store.printing,
    deviceName:   store.deviceName,
    connect:      store.connect,
    disconnect:   store.disconnect,
    print:        store.print,
    printSabotay: store.printSabotay,
    printKane:    store.printKane,
  }
}