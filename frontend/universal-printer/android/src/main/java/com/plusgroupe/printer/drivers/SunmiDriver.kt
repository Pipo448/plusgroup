package com.plusgroupe.printer.drivers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterException
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.SunmiPrinterService
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Driver pou Sunmi POS (V1, V2, T1, T2, P2, elatriye ki gen enprimant entegre)
 *
 * ✅ KORIJE — Itilize API DEDYE Sunmi a (printText/printBitmap/cutPaper) olye
 * bytes ESC/POS manyèl. Premye vèsyon an (sendRAWData ak bytes ESC/POS manyèl)
 * te bay "resi blanch" paske sèvis entèn Sunmi a pa aplike TOUT kòmand ESC/POS
 * estanda yo menm jan ak yon vrè enprimant tèmik. API dedye a se apwòch OFISYÈL
 * rekòmande Sunmi bay, e li aksepte String Kotlin dirèkteman (rezoud ankòdaj
 * aksan Kreyòl san bezwen codepage manyèl tou).
 */
class SunmiDriver(private val context: Context) : PrinterDriver {

    companion object {
        private const val TAG = "SunmiDriver"
        // Aliyman Sunmi: 0=goch, 1=santral, 2=dwat
        private const val ALIGN_LEFT = 0
        private const val ALIGN_CENTER = 1
        private const val ALIGN_RIGHT = 2
    }

    private var printerService: SunmiPrinterService? = null

    private val innerCallback = object : InnerPrinterCallback() {
        override fun onConnected(service: SunmiPrinterService) {
            printerService = service
            Log.i(TAG, "Sunmi printer service konekte")
        }
        override fun onDisconnected() {
            printerService = null
            Log.i(TAG, "Sunmi printer service dekonekte")
        }
    }

    override fun initialize(): Boolean {
        return try {
            val latch = CountDownLatch(1)
            val callbackWithLatch = object : InnerPrinterCallback() {
                override fun onConnected(service: SunmiPrinterService) {
                    printerService = service
                    latch.countDown()
                }
                override fun onDisconnected() {
                    printerService = null
                }
            }
            InnerPrinterManager.getInstance().bindService(context, callbackWithLatch)
            latch.await(3, TimeUnit.SECONDS)
            printerService?.let {
                try { it.printerInit(null) } catch (e: Exception) { /* ignore */ }
            }
            printerService != null
        } catch (e: InnerPrinterException) {
            Log.e(TAG, "Erè koneksyon Sunmi: ${e.message}", e)
            false
        } catch (e: Exception) {
            Log.e(TAG, "Erè initialize Sunmi: ${e.message}", e)
            false
        }
    }

    override fun isReady(): Boolean = printerService != null

    override fun getStatusMessage(): String {
        val service = printerService ?: return "Enprimant Sunmi pa konekte"
        return try {
            "Enprimant Sunmi prè (${service.printerModal ?: "?"})"
        } catch (e: Exception) {
            "Enprimant Sunmi konekte"
        }
    }

    override fun print(lines: JSONArray, copies: Int): PrinterDriver.Result {
        val service = printerService
            ?: return PrinterDriver.Result(false, "Enprimant Sunmi pa konekte")

        return try {
            for (copy in 0 until copies) {
                service.printerInit(null)
                for (i in 0 until lines.length()) {
                    processLine(lines.getJSONObject(i), service)
                }
                // Koupe/anfoto apre chak kopi si "cut" pa deja nan lis la
                service.lineWrap(3, null)
            }
            PrinterDriver.Result(true, "Enprime avèk siksè via Sunmi")
        } catch (e: Exception) {
            Log.e(TAG, "Erè enprime Sunmi: ${e.message}", e)
            PrinterDriver.Result(false, "Erè: ${e.message}")
        }
    }

    override fun destroy() {
        try {
            InnerPrinterManager.getInstance().unBindService(context, innerCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Erè dekonekte Sunmi: ${e.message}")
        } finally {
            printerService = null
        }
    }

    // ═══════════════════════════════════════════════════
    // TRETE CHAK LIY (itilize API dedye Sunmi a)
    // ═══════════════════════════════════════════════════

    private fun processLine(line: JSONObject, service: SunmiPrinterService) {
        try {
            when (line.optString("type")) {
                "text"    -> printTextLine(line, service)
                "divider" -> {
                    val char = line.optString("char", "-")
                    service.setAlignment(ALIGN_LEFT, null)
                    service.printText(char.repeat(32) + "\n", null)
                }
                "space"   -> service.lineWrap(line.optInt("lines", 1), null)
                "image"   -> printImageLine(line, service)
                "table"   -> printTableLine(line, service)
                "feed"    -> service.lineWrap(line.optInt("lines", 3), null)
                "cut"     -> service.cutPaper(null)
                "beep"    -> { /* Pa gen bouton beep dedye — ka ajoute pita si nesesè */ }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erè trete liy Sunmi (${line.optString("type")}): ${e.message}")
        }
    }

    private fun printTextLine(line: JSONObject, service: SunmiPrinterService) {
        val align = when (line.optString("align", "left")) {
            "center" -> ALIGN_CENTER
            "right"  -> ALIGN_RIGHT
            else     -> ALIGN_LEFT
        }
        service.setAlignment(align, null)

        val fontSize = when (line.optString("size", "normal")) {
            "large"  -> 32f
            "xlarge" -> 40f
            else     -> 24f
        }

        val content = line.optString("content", "") + "\n"

        if (line.optBoolean("bold")) {
            // ✅ Aktive/dezaktive an gra ak kòmand ESC senp (sipòte pa sèvis la
            // menm nan mòd API dedye a — se sèl 2 bytes estil, pa done tèks)
            try { service.sendRAWData(byteArrayOf(0x1B, 0x45, 0x01), null) } catch (e: Exception) {}
            service.printTextWithFont(content, null, fontSize, null)
            try { service.sendRAWData(byteArrayOf(0x1B, 0x45, 0x00), null) } catch (e: Exception) {}
        } else {
            service.printTextWithFont(content, null, fontSize, null)
        }
    }

    private fun printTableLine(line: JSONObject, service: SunmiPrinterService) {
        val columns = line.optJSONArray("columns") ?: return
        val sb = StringBuilder()
        for (i in 0 until columns.length()) {
            val col   = columns.getJSONObject(i)
            val text  = col.optString("text", "")
            val width = col.optInt("width", 33)
            val chars = (width * 32 / 100).coerceAtLeast(1)
            sb.append(text.padEnd(chars).take(chars))
        }
        service.setAlignment(ALIGN_LEFT, null)

        if (line.optBoolean("bold")) {
            try { service.sendRAWData(byteArrayOf(0x1B, 0x45, 0x01), null) } catch (e: Exception) {}
            service.printText(sb.toString() + "\n", null)
            try { service.sendRAWData(byteArrayOf(0x1B, 0x45, 0x00), null) } catch (e: Exception) {}
        } else {
            service.printText(sb.toString() + "\n", null)
        }
    }

    private fun printImageLine(line: JSONObject, service: SunmiPrinterService) {
        val urlStr = line.optString("url", "")
        if (urlStr.isEmpty()) return

        try {
            val align = when (line.optString("align", "center")) {
                "left"  -> ALIGN_LEFT
                "right" -> ALIGN_RIGHT
                else    -> ALIGN_CENTER
            }
            service.setAlignment(align, null)

            val bitmap: Bitmap? = if (urlStr.startsWith("data:")) {
                val base64Data = urlStr.substringAfter(",")
                val bytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            } else {
                val connection = URL(urlStr).openConnection()
                connection.connectTimeout = 6000
                connection.readTimeout = 6000
                connection.getInputStream().use { BitmapFactory.decodeStream(it) }
            }

            if (bitmap == null) return

            // Redimansyone pou 384 dots (58mm estanda) — API dedye a jere
            // konvèsyon raster la poukont li, nou jis bay Bitmap la
            val targetWidth = 384
            val scale = targetWidth.toFloat() / bitmap.width
            val targetHeight = (bitmap.height * scale).toInt().coerceAtLeast(1)
            val scaled = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)

            service.printBitmap(scaled, null)

            if (!scaled.isRecycled) scaled.recycle()

        } catch (e: Exception) {
            Log.e(TAG, "Erè enprime imaj Sunmi: ${e.message}", e)
        }
    }
}
