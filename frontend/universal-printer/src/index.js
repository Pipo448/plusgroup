import { registerPlugin } from '@capacitor/core'

const UniversalPrinter = registerPlugin('UniversalPrinter', {
  web: () => import('./web.js').then(m => new m.UniversalPrinterWeb()),
})

export { UniversalPrinter }
