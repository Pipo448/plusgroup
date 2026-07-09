/**
 * Universal Printer Plugin
 * Sipò pou tout POS Android ki gen enprimant entegre (Sunmi, iMin, Telpo)
 * ak fallback sou enprimant Bluetooth ESC/POS.
 */

export type PrinterType =
  | 'sunmi'      // Sunmi V2, V2 Pro, V3, D3 Mini, etc.
  | 'imin'       // iMin M2, Swift 1/2, etc.
  | 'telpo'      // Telpo M3, TPS310, etc.
  | 'bluetooth'  // Nenpòt enprimant Bluetooth ESC/POS
  | 'none'       // Pa gen enprimant detekte

export type PaperWidth = 58 | 80  // milimèt

export type TextAlign = 'left' | 'center' | 'right'
export type TextSize  = 'small' | 'normal' | 'large' | 'xlarge'

export interface PrinterInfo {
  /** Ki mak POS la */
  printerType: PrinterType
  /** Non modèl aparèy la (egzanp: "V2_PRO", "M2_PRO") */
  deviceModel?: string
  /** Lajè papye a nan mm (58 oswa 80) */
  paperWidth: PaperWidth
  /** Èske enprimant lan prè pou enprime? */
  isReady: boolean
  /** Statis enprimant lan (gen papye? tèmperati? etc.) */
  statusMessage?: string
}

// ═══════════════════════════════════════════════════
// LINY YO — Blòk pou konstwi resi a
// ═══════════════════════════════════════════════════

export interface TextLine {
  type: 'text'
  content: string
  align?: TextAlign
  size?: TextSize
  bold?: boolean
  underline?: boolean
}

export interface DividerLine {
  type: 'divider'
  char?: string    // egzanp: '-', '=', '*' (defo: '-')
}

export interface SpaceLine {
  type: 'space'
  lines?: number   // konbyen liy blan (defo: 1)
}

export interface ImageLine {
  type: 'image'
  /** URL oswa base64 imaj la */
  url: string
  align?: TextAlign
  /** Lajè maksimòm nan pixel (defo: lajè papye a) */
  maxWidth?: number
}

export interface QRCodeLine {
  type: 'qrcode'
  content: string
  align?: TextAlign
  size?: number    // 4-16 (defo: 8)
}

export interface BarcodeLine {
  type: 'barcode'
  content: string
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8'
  align?: TextAlign
}

export interface TableLine {
  type: 'table'
  /** Kolòn yo (egzanp: [{ text: 'Pwodwi', width: 60 }, { text: 'Pri', width: 40, align: 'right' }]) */
  columns: Array<{ text: string; width: number; align?: TextAlign }>
}

export interface FeedLine {
  type: 'feed'
  lines?: number   // konbyen liy pou vanse (defo: 3)
}

export interface CutLine {
  type: 'cut'
}

export interface BeepLine {
  type: 'beep'
  times?: number   // konbyen fwa (defo: 1)
}

export type PrintLine =
  | TextLine
  | DividerLine
  | SpaceLine
  | ImageLine
  | QRCodeLine
  | BarcodeLine
  | TableLine
  | FeedLine
  | CutLine
  | BeepLine

// ═══════════════════════════════════════════════════
// OPSYON POU PRINT
// ═══════════════════════════════════════════════════

export interface PrintOptions {
  lines: PrintLine[]
  /** Konbyen kopi (defo: 1) */
  copies?: number
  /** Auto-koupe papye nan fen (defo: true) */
  cutAtEnd?: boolean
  /** Beep apre print (defo: false) */
  beepAtEnd?: boolean
}

export interface PrintResult {
  success: boolean
  printerUsed: PrinterType
  message?: string
}

// ═══════════════════════════════════════════════════
// BLUETOOTH ESPESIFIK
// ═══════════════════════════════════════════════════

export interface BluetoothDevice {
  name: string
  address: string   // MAC address
  bonded: boolean
}

export interface ScanBluetoothResult {
  devices: BluetoothDevice[]
}

// ═══════════════════════════════════════════════════
// PLUGIN INTERFACE PRENSIPAL
// ═══════════════════════════════════════════════════

export interface UniversalPrinterPlugin {
  /**
   * Jwenn enfòmasyon sou enprimant lan sou aparèy sa a.
   * Otomatikman detekte mak POS la.
   */
  getInfo(): Promise<PrinterInfo>

  /**
   * Enprime yon dokiman.
   * Plugin nan chwazi bon driver la otomatikman.
   */
  print(options: PrintOptions): Promise<PrintResult>

  /**
   * Sèlman pou Bluetooth: chèche enprimant ki disponib.
   */
  scanBluetoothPrinters(): Promise<ScanBluetoothResult>

  /**
   * Sèlman pou Bluetooth: konekte ak yon enprimant espesifik.
   * Sove chwa a pou pwochenn fwa.
   */
  connectBluetoothPrinter(options: { address: string }): Promise<{ success: boolean }>

  /**
   * Retire koneksyon Bluetooth aktyèl la.
   */
  disconnectBluetoothPrinter(): Promise<void>

  /**
   * Tès rapid: enprime yon paj tès.
   */
  printTestPage(): Promise<PrintResult>

  /**
   * Louvri drawer kes (pou aparèy ki gen li).
   */
  openCashDrawer?(): Promise<{ success: boolean }>
}
