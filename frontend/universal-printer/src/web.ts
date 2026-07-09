import { WebPlugin } from '@capacitor/core'

import type {
  UniversalPrinterPlugin,
  PrinterInfo,
  PrintOptions,
  PrintResult,
  ScanBluetoothResult,
} from './definitions'

/**
 * Fallback pou navigatè web (Chrome, Firefox, etc.)
 * Itilize window.print() ki jenere yon HTML resi ka enprime.
 */
export class UniversalPrinterWeb extends WebPlugin implements UniversalPrinterPlugin {

  async getInfo(): Promise<PrinterInfo> {
    return {
      printerType: 'none',
      paperWidth: 80,
      isReady: true,
      statusMessage: 'Mòd navigatè — window.print() ap itilize',
    }
  }

  async print(options: PrintOptions): Promise<PrintResult> {
    // Bati HTML resi soti nan liy yo
    const html = this.buildHtml(options)

    // Louvri yon fenèt ki kache epi imprim li
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) {
      return {
        success: false,
        printerUsed: 'none',
        message: 'Pa kapab louvri fenèt enprime. Verifye popup blocker.',
      }
    }

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    // Tann yon ti tan pou HTML la chaje
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)

    return {
      success: true,
      printerUsed: 'none',
      message: 'Voye nan window.print()',
    }
  }

  async scanBluetoothPrinters(): Promise<ScanBluetoothResult> {
    return { devices: [] }
  }

  async connectBluetoothPrinter(): Promise<{ success: boolean }> {
    return { success: false }
  }

  async disconnectBluetoothPrinter(): Promise<void> {
    // No-op sou web
  }

  async printTestPage(): Promise<PrintResult> {
    return this.print({
      lines: [
        { type: 'text', content: 'PAJ TÈS', align: 'center', size: 'xlarge', bold: true },
        { type: 'divider' },
        { type: 'text', content: 'Universal Printer' },
        { type: 'text', content: `Dat: ${new Date().toLocaleString('fr-HT')}` },
        { type: 'divider' },
        { type: 'text', content: 'Enprimant ap mache!' },
      ],
    })
  }

  // ═══════════════════════════════════════════════════
  // HELPER PRIVATE
  // ═══════════════════════════════════════════════════

  private buildHtml(options: PrintOptions): string {
    const bodyHtml = options.lines.map(line => this.lineToHtml(line)).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Resi</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 8px;
            width: 80mm;
          }
          .center { text-align: center; }
          .left { text-align: left; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .underline { text-decoration: underline; }
          .small { font-size: 10px; }
          .normal { font-size: 12px; }
          .large { font-size: 16px; }
          .xlarge { font-size: 20px; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .space { height: 8px; }
          img { max-width: 100%; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px; vertical-align: top; }
        </style>
      </head>
      <body>${bodyHtml}</body>
      </html>
    `
  }

  private lineToHtml(line: any): string {
    switch (line.type) {
      case 'text': {
        const classes = [
          line.align || 'left',
          line.size || 'normal',
          line.bold ? 'bold' : '',
          line.underline ? 'underline' : '',
        ].filter(Boolean).join(' ')
        return `<div class="${classes}">${this.escapeHtml(line.content)}</div>`
      }
      case 'divider':
        return `<div class="divider"></div>`
      case 'space':
        return `<div class="space" style="height:${(line.lines || 1) * 8}px"></div>`
      case 'image':
        return `<div class="${line.align || 'center'}"><img src="${line.url}" alt=""/></div>`
      case 'qrcode':
      case 'barcode':
        // Pou sipò senp: jis afiche kòd la kòm tèks
        return `<div class="${line.align || 'center'} small">[${line.type.toUpperCase()}] ${this.escapeHtml(line.content)}</div>`
      case 'table': {
        const cells = line.columns.map((c: any) =>
          `<td style="width:${c.width}%; text-align:${c.align || 'left'}">${this.escapeHtml(c.text)}</td>`
        ).join('')
        return `<table><tr>${cells}</tr></table>`
      }
      case 'feed':
        return `<div style="height:${(line.lines || 3) * 12}px"></div>`
      case 'cut':
      case 'beep':
        return '' // Ignore sou web
      default:
        return ''
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
