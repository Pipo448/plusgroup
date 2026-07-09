# @capacitor-plus/universal-printer

Plugin Capacitor pou enprime sou nenpòt POS Android — Sunmi, iMin, Telpo, oswa Bluetooth ESC/POS.

## 📱 Sipò

| Mak POS | Modèl | Sipò |
|---------|-------|------|
| Sunmi | V1, V2, V2 Pro, V3, D3, T2 | 🟡 Faz 3B |
| iMin | M2 Pro, M2 Max, Swift 1/2, D1/D3/D4 | 🟡 Faz 3B |
| Telpo | M3, TPS310, TPS550 | 🟡 Faz 3B |
| **Bluetooth ESC/POS** | Nenpòt | ✅ Fini |

**Ki sa sa vle di?** Kounye a, plugin nan sipòte Bluetooth ESC/POS 100% (ki mache ak preske tout enprimant tèmik). Driver espesifik (Sunmi, iMin, Telpo) ap parèt nan pwochen sesyon yo.

## 🚀 Enstalasyon

Nan `frontend/`:

```bash
# Kopye plugin la nan pwojè w
cp -r ../plugin ./universal-printer

# Enstale li lokalman
npm install ./universal-printer

# Sync ak Android
npx cap sync android
```

## 💻 Itilizasyon

```javascript
import { UniversalPrinter } from '@capacitor-plus/universal-printer'

// 1. Jwenn enfo sou enprimant lan
const info = await UniversalPrinter.getInfo()
console.log(info)
// { printerType: 'bluetooth', deviceModel: 'SAMSUNG_A54', paperWidth: 80, isReady: true }

// 2. Enprime yon resi
await UniversalPrinter.print({
  lines: [
    { type: 'text', content: 'PLUS GROUP', align: 'center', size: 'xlarge', bold: true },
    { type: 'text', content: 'Ouanaminthe, Ayiti', align: 'center' },
    { type: 'divider' },
    { type: 'text', content: 'Fakti #DEV-2026-0001' },
    { type: 'text', content: 'Dat: 08/07/2026' },
    { type: 'space' },
    { type: 'table', columns: [
      { text: 'Pwodwi', width: 60 },
      { text: 'Pri', width: 40, align: 'right' }
    ]},
    { type: 'text', content: 'Chaise Pliante x 24' },
    { type: 'text', content: '84 000 HTG', align: 'right', bold: true },
    { type: 'divider' },
    { type: 'text', content: 'TOTAL: 84 000 HTG', bold: true, size: 'large', align: 'right' },
    { type: 'space', lines: 2 },
    { type: 'qrcode', content: 'https://plusgroupe.com/f/DEV-2026-0001', align: 'center' },
    { type: 'space' },
    { type: 'text', content: 'Mèsi pou konfyans ou!', align: 'center', bold: true },
  ],
  copies: 1,
  cutAtEnd: true
})

// 3. Tès rapid
await UniversalPrinter.printTestPage()

// 4. Konfigire yon enprimant Bluetooth
const { devices } = await UniversalPrinter.scanBluetoothPrinters()
// Chwazi yon device
await UniversalPrinter.connectBluetoothPrinter({ address: devices[0].address })
```

## 📚 API Konplè

Gade `src/definitions.ts` pou tout tip yo.

## 🛠️ Devlopman

Estrikti:
```
android/src/main/java/com/plusgroupe/printer/
├── UniversalPrinterPlugin.kt    ← Ponte Capacitor
├── PrinterManager.kt            ← Kontwolè prensipal
├── detectors/
│   └── DeviceDetector.kt        ← Detekte mak POS
└── drivers/
    ├── PrinterDriver.kt         ← Interface
    ├── BluetoothDriver.kt       ← ✅ Fini
    ├── SunmiDriver.kt           ← 🟡 Placeholder
    ├── IMinDriver.kt            ← 🟡 Placeholder
    └── TelpoDriver.kt           ← 🟡 Placeholder
```
