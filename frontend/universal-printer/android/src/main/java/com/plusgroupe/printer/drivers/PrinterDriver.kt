package com.plusgroupe.printer.drivers

import org.json.JSONArray

/**
 * Kontra ke chak driver (Sunmi, iMin, Telpo, Bluetooth) dwe respekte.
 * Kòd la nan PrinterManager ap toujou rele metòd sa yo — pa dwe konnen ki mak.
 */
interface PrinterDriver {

    /**
     * Èske enprimant lan prè pou enprime?
     */
    fun isReady(): Boolean

    /**
     * Retounen mesaj statis (opsyonèl)
     */
    fun getStatusMessage(): String?

    /**
     * Enprime yon lis liy (JSON array).
     * Format chak liy: { type: "text"|"divider"|"image"|..., ... }
     * Gade definitions.ts pou tout tip yo.
     */
    fun print(lines: JSONArray, copies: Int = 1): Result

    /**
     * Fè inisyalizasyon (rele nan onCreate)
     */
    fun initialize(): Boolean

    /**
     * Netwaye resous (rele nan onDestroy)
     */
    fun destroy()

    data class Result(
        val success: Boolean,
        val message: String? = null
    )
}
