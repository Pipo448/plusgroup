package com.plusgroupe.printer.drivers

import android.content.Context
import org.json.JSONArray

/**
 * ⚠️ PLACEHOLDER — TODO: Implémente nan pwochen sesyon
 */
class IMinDriver(private val context: Context) : PrinterDriver {
    override fun initialize(): Boolean = false
    override fun isReady(): Boolean = false
    override fun getStatusMessage(): String = "IMinDriver — POKO IMPLEMENTE"
    override fun print(lines: JSONArray, copies: Int): PrinterDriver.Result {
        return PrinterDriver.Result(false, "IMinDriver poko fini")
    }
    override fun destroy() {}
}
