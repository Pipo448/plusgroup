package com.plusgroupe.printer.drivers

import android.content.Context
import org.json.JSONArray

/**
 * Driver pou Sunmi POS
 *
 * ⚠️ PLACEHOLDER — TODO: Implémente nan pwochen sesyon
 *
 * SDK nesesè:
 * - SunmiPrinterService.jar (a jwenn sou GitHub Sunmi)
 * - AIDL fichye yo bezwen kopye nan yon dosye aidl/
 *
 * Sipò pou:
 * - Enprime tèks ak alignements
 * - Enprime imaj (logo)
 * - QR code, Barcode
 * - Koupe papye
 * - Detekte statis papye
 */
class SunmiDriver(private val context: Context) : PrinterDriver {

    override fun initialize(): Boolean {
        // TODO: Konekte ak Sunmi SDK Service
        return false
    }

    override fun isReady(): Boolean {
        // TODO
        return false
    }

    override fun getStatusMessage(): String {
        return "Sunmi driver — POKO IMPLEMENTE"
    }

    override fun print(lines: JSONArray, copies: Int): PrinterDriver.Result {
        return PrinterDriver.Result(
            success = false,
            message = "Sunmi driver poko fini. Ap parèt nan pwochen sesyon."
        )
    }

    override fun destroy() {
        // TODO: Dekonekte SDK
    }
}
