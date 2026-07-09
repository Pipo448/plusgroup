import { registerPlugin } from '@capacitor/core'

import type { UniversalPrinterPlugin } from './definitions'

const UniversalPrinter = registerPlugin<UniversalPrinterPlugin>('UniversalPrinter', {
  web: () => import('./web').then(m => new m.UniversalPrinterWeb()),
})

export * from './definitions'
export { UniversalPrinter }
