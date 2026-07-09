package com.plusgroupe.printer

import android.content.Context
import com.plusgroupe.printer.detectors.DeviceDetector
import com.plusgroupe.printer.drivers.*
import org.json.JSONArray

/**
 * Kontwolè prensipal ki ochestre tout enprimant yo.
 *
 * Fonksyon:
 * 1. Detekte otomatikman mak POS la
 * 2. Chwazi driver ki apwopriye a
 * 3. Fallback sou Bluetooth si mak la pa rekonèt
 */
class PrinterManager(private val context: Context) {

    private val detector = DeviceDetector(context)
    private var currentDriver: PrinterDriver? = null
    private var currentType: DeviceDetector.PrinterType = DeviceDetector.PrinterType.NONE

    init {
        setupDriver()
    }

    private fun setupDriver() {
        currentType = detector.detect()
        currentDriver = when (currentType) {
            DeviceDetector.PrinterType.SUNMI     -> SunmiDriver(context)
            DeviceDetector.PrinterType.IMIN      -> IMinDriver(context)
            DeviceDetector.PrinterType.TELPO     -> TelpoDriver(context)
            DeviceDetector.PrinterType.BLUETOOTH -> BluetoothDriver(context)
            DeviceDetector.PrinterType.NONE      -> null
        }
        currentDriver?.initialize()
    }

    /**
     * Fè re-deteksyon (rele si sitiyasyon chanje)
     */
    fun refresh() {
        currentDriver?.destroy()
        setupDriver()
    }

    fun getPrinterType(): String = currentType.name.lowercase()

    fun getDeviceModel(): String = detector.getDeviceModel()

    fun getPaperWidth(): Int = detector.getPaperWidth()

    fun isReady(): Boolean = currentDriver?.isReady() ?: false

    fun getStatusMessage(): String {
        return currentDriver?.getStatusMessage() ?: "Pa gen enprimant detekte"
    }

    /**
     * Enprime — automatikman itilize driver aktif la
     */
    fun print(lines: JSONArray, copies: Int = 1): PrinterDriver.Result {
        val driver = currentDriver
            ?: return PrinterDriver.Result(false, "Pa gen enprimant konfigire sou aparèy sa a")

        return driver.print(lines, copies)
    }

    /**
     * Retounen Bluetooth driver pou konfigirasyon
     */
    fun getBluetoothDriver(): BluetoothDriver {
        // Toujou kreye yon nouvo BluetoothDriver pou operasyon Bluetooth
        // (chak POS ka gen Bluetooth menm si li se Sunmi/iMin)
        return BluetoothDriver(context)
    }

    fun destroy() {
        currentDriver?.destroy()
        currentDriver = null
    }
}
