package com.plusgroupe.printer.detectors

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/**
 * Detekte otomatikman ki mak POS aparèy la ye.
 *
 * Metòd yo:
 * 1. Verifye Build.MANUFACTURER ak Build.MODEL
 * 2. Verifye si sèvis native mak la egziste (AIDL / Content Provider)
 * 3. Retounen tip la
 */
class DeviceDetector(private val context: Context) {

    enum class PrinterType {
        SUNMI,
        IMIN,
        TELPO,
        BLUETOOTH,
        NONE
    }

    fun detect(): PrinterType {
        return when {
            isSunmi()  -> PrinterType.SUNMI
            isIMin()   -> PrinterType.IMIN
            isTelpo()  -> PrinterType.TELPO
            hasBluetoothPrinterConfigured() -> PrinterType.BLUETOOTH
            else -> PrinterType.NONE
        }
    }

    /**
     * Retounen non modèl aparèy la (pou log / debug)
     */
    fun getDeviceModel(): String {
        return "${Build.MANUFACTURER}_${Build.MODEL}".uppercase()
    }

    /**
     * Detekte lajè papye estanda pou aparèy sa a
     * Pi fò POS Sunmi/iMin gen 58mm oswa 80mm
     */
    fun getPaperWidth(): Int {
        val model = "${Build.MANUFACTURER} ${Build.MODEL}".uppercase()
        return when {
            // Sunmi POS ki gen 80mm
            model.contains("T2") || model.contains("V3") || model.contains("D3") -> 80
            // Sunmi POS ki gen 58mm (defo pou pi fò handheld yo)
            model.contains("V1") || model.contains("V2") -> 58
            // iMin
            model.contains("M2 PRO") || model.contains("M2 MAX") -> 80
            model.contains("SWIFT") -> 58
            // Telpo
            model.contains("M3") -> 58
            model.contains("TPS") -> 80
            // Defo (pi komen): 80mm
            else -> 80
        }
    }

    // ═══════════════════════════════════════════════════
    // DETEKSYON MAK YO
    // ═══════════════════════════════════════════════════

    private fun isSunmi(): Boolean {
        // Metòd 1: Verifye MANUFACTURER
        if (Build.MANUFACTURER.equals("SUNMI", ignoreCase = true)) {
            return true
        }
        // Metòd 2: Verifye si sèvis Sunmi egziste
        return isPackageInstalled("woyou.aidlservice.jiuiv5") ||
               isPackageInstalled("woyou.aidlservice.jiuv5")
    }

    private fun isIMin(): Boolean {
        // Metòd 1: Verifye MANUFACTURER
        if (Build.MANUFACTURER.contains("iMin", ignoreCase = true) ||
            Build.MANUFACTURER.contains("IMIN", ignoreCase = true)) {
            return true
        }
        // Metòd 2: Modèl komen iMin
        val model = Build.MODEL.uppercase()
        if (model.startsWith("M2-") || model.startsWith("SWIFT") ||
            model.startsWith("D1") || model.startsWith("D3") ||
            model.startsWith("D4")) {
            // Verifye si sèvis iMin egziste anplis
            if (isPackageInstalled("com.imin.printerservice") ||
                isPackageInstalled("com.imin.print")) {
                return true
            }
        }
        // Metòd 3: Verifye pa package name sèl
        return isPackageInstalled("com.imin.printerservice")
    }

    private fun isTelpo(): Boolean {
        // Metòd 1: MANUFACTURER
        if (Build.MANUFACTURER.contains("Telpo", ignoreCase = true) ||
            Build.MANUFACTURER.contains("TELPO", ignoreCase = true)) {
            return true
        }
        // Metòd 2: Modèl komen Telpo
        val model = Build.MODEL.uppercase()
        return model.startsWith("TPS") ||
               model.startsWith("M3") ||
               model.startsWith("TP") ||
               isPackageInstalled("com.telpo.tps550.api")
    }

    /**
     * Verifye si gen yon enprimant Bluetooth ki konfigire (nan preferans)
     */
    private fun hasBluetoothPrinterConfigured(): Boolean {
        val prefs = context.getSharedPreferences("universal_printer", Context.MODE_PRIVATE)
        val savedAddress = prefs.getString("bluetooth_printer_address", null)
        return !savedAddress.isNullOrEmpty()
    }

    private fun isPackageInstalled(packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }
}
