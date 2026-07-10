package com.plusgroupe.printer.drivers

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.URL
import java.nio.charset.Charset
import java.util.UUID

/**
 * Bluetooth ESC/POS driver — FALLBACK pou nenpòt POS ki gen enprimant Bluetooth
 *
 * Se driver sa a ki ap mache si POS la se pa Sunmi/iMin/Telpo.
 * Li itilize kòmand ESC/POS estanda ki mache sou 99% enprimant tèmik.
 */
class BluetoothDriver(private val context: Context) : PrinterDriver {

    companion object {
        private const val TAG = "BluetoothDriver"
        private val PRINTER_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private const val PREFS_NAME = "universal_printer"
        private const val PREFS_KEY = "bluetooth_printer_address"

        // ESC/POS kòmand
        private val ESC = 0x1B.toByte()
        private val GS  = 0x1D.toByte()
        private val LF  = 0x0A.toByte()

        // Initialize
        val INIT           = byteArrayOf(ESC, 0x40)
        // Alignement
        val ALIGN_LEFT     = byteArrayOf(ESC, 0x61, 0x00)
        val ALIGN_CENTER   = byteArrayOf(ESC, 0x61, 0x01)
        val ALIGN_RIGHT    = byteArrayOf(ESC, 0x61, 0x02)
        // Text style
        val BOLD_ON        = byteArrayOf(ESC, 0x45, 0x01)
        val BOLD_OFF       = byteArrayOf(ESC, 0x45, 0x00)
        val UNDERLINE_ON   = byteArrayOf(ESC, 0x2D, 0x01)
        val UNDERLINE_OFF  = byteArrayOf(ESC, 0x2D, 0x00)
        // Text size
        val SIZE_NORMAL    = byteArrayOf(GS, 0x21, 0x00)
        val SIZE_LARGE     = byteArrayOf(GS, 0x21, 0x11)
        val SIZE_XLARGE    = byteArrayOf(GS, 0x21, 0x22)
        // Cut
        val CUT_FULL       = byteArrayOf(GS, 0x56, 0x00)
        val CUT_PARTIAL    = byteArrayOf(GS, 0x56, 0x01)
        // ✅ NOUVO — Seleksyon codepage (Windows-1252) pou aksan Kreyòl/Franse yo (è, ò, à, é)
        // Sa korije karaktè "chinwa" etranj ki parèt lè ou enprime tèks ak aksan
        val SELECT_CODEPAGE_1252 = byteArrayOf(ESC, 0x74, 16)
        // Feed
        fun feedLines(n: Int) = byteArrayOf(ESC, 0x64, n.toByte())
        // Beep
        val BEEP           = byteArrayOf(ESC, 0x42, 0x03, 0x03)
    }

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    override fun initialize(): Boolean {
        return true // Koneksyon fè lazy nan print()
    }

    override fun isReady(): Boolean {
        val savedAddress = getSavedAddress()
        return !savedAddress.isNullOrEmpty()
    }

    override fun getStatusMessage(): String {
        val savedAddress = getSavedAddress()
        return if (savedAddress.isNullOrEmpty()) {
            "Pa gen enprimant Bluetooth konekte"
        } else {
            "Enprimant Bluetooth prè ($savedAddress)"
        }
    }

    override fun print(lines: JSONArray, copies: Int): PrinterDriver.Result {
        val address = getSavedAddress()
            ?: return PrinterDriver.Result(false, "Pa gen enprimant Bluetooth konfigire")

        try {
            // Konekte
            if (!connect(address)) {
                return PrinterDriver.Result(false, "Pa kapab konekte ak enprimant Bluetooth")
            }

            // Enprime kopi yo
            for (copy in 0 until copies) {
                writeBytes(INIT)
                // ✅ NOUVO — Chwazi codepage Windows-1252 pou aksan Kreyòl/Franse yo byen enprime
                writeBytes(SELECT_CODEPAGE_1252)

                for (i in 0 until lines.length()) {
                    val line = lines.getJSONObject(i)
                    processLine(line)
                }
            }

            // ✅ NOUVO — Ti poz final anvan fèmen koneksyon an, pou asire enprimant lan
            // fin trete/enprime TOUT done yo (sitou imaj) anvan Bluetooth sokèt la fèmen.
            // San sa, koneksyon fèmen ka koupe done ki poko fin voye/trete.
            try { Thread.sleep(400) } catch (e: InterruptedException) {}

            // Netwaye
            disconnect()

            return PrinterDriver.Result(true, "Enprime avèk siksè via Bluetooth")

        } catch (e: Exception) {
            Log.e(TAG, "Erè enprime: ${e.message}", e)
            disconnect()
            return PrinterDriver.Result(false, "Erè: ${e.message}")
        }
    }

    override fun destroy() {
        disconnect()
    }

    // ═══════════════════════════════════════════════════
    // KONEKSYON
    // ═══════════════════════════════════════════════════

    @Suppress("MissingPermission")
    private fun connect(address: String): Boolean {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: return false
            if (!adapter.isEnabled) return false

            val device: BluetoothDevice = adapter.getRemoteDevice(address)
            adapter.cancelDiscovery()

            socket = device.createRfcommSocketToServiceRecord(PRINTER_UUID)
            socket?.connect()
            outputStream = socket?.outputStream

            return outputStream != null
        } catch (e: Exception) {
            Log.e(TAG, "Konneksyon Bluetooth echwe: ${e.message}", e)
            return false
        }
    }

    private fun disconnect() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Erè fèmen: ${e.message}")
        } finally {
            outputStream = null
            socket = null
        }
    }

    // ═══════════════════════════════════════════════════
    // ENPRIME LINY YO
    // ═══════════════════════════════════════════════════

    private fun processLine(line: JSONObject) {
        when (line.optString("type")) {
            "text"     -> printText(line)
            "divider"  -> printDivider(line)
            "space"    -> printSpace(line)
            "image"    -> printImage(line)
            "qrcode"   -> printQrCode(line)
            "barcode"  -> printBarcode(line)
            "table"    -> printTable(line)
            "feed"     -> writeBytes(feedLines(line.optInt("lines", 3)))
            "cut"      -> writeBytes(CUT_PARTIAL)
            "beep"     -> {
                val times = line.optInt("times", 1)
                for (i in 0 until times) writeBytes(BEEP)
            }
        }
    }

    private fun printText(line: JSONObject) {
        // Alignement
        when (line.optString("align", "left")) {
            "center" -> writeBytes(ALIGN_CENTER)
            "right"  -> writeBytes(ALIGN_RIGHT)
            else     -> writeBytes(ALIGN_LEFT)
        }

        // Size
        when (line.optString("size", "normal")) {
            "large"  -> writeBytes(SIZE_LARGE)
            "xlarge" -> writeBytes(SIZE_XLARGE)
            else     -> writeBytes(SIZE_NORMAL)
        }

        // Style
        if (line.optBoolean("bold")) writeBytes(BOLD_ON)
        if (line.optBoolean("underline")) writeBytes(UNDERLINE_ON)

        // Content
        val content = line.optString("content", "")
        writeString(content + "\n")

        // Reset
        writeBytes(BOLD_OFF)
        writeBytes(UNDERLINE_OFF)
        writeBytes(SIZE_NORMAL)
        writeBytes(ALIGN_LEFT)
    }

    private fun printDivider(line: JSONObject) {
        val char = line.optString("char", "-")
        writeString(char.repeat(32) + "\n") // 32 karaktè pou 58mm papye
    }

    private fun printSpace(line: JSONObject) {
        val count = line.optInt("lines", 1)
        for (i in 0 until count) writeString("\n")
    }

    private fun printImage(line: JSONObject) {
        val urlStr = line.optString("url", "")
        if (urlStr.isEmpty()) return

        try {
            // Aline
            when (line.optString("align", "center")) {
                "left"  -> writeBytes(ALIGN_LEFT)
                "right" -> writeBytes(ALIGN_RIGHT)
                else    -> writeBytes(ALIGN_CENTER)
            }

            // ✅ NOUVO — Telechaje/dekode vrè imaj la (URL oswa base64 data URI)
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

            if (bitmap == null) {
                Log.e(TAG, "Pa ka chaje imaj la: $urlStr")
                writeBytes(ALIGN_LEFT)
                return
            }

            printBitmap(bitmap)
            writeBytes(ALIGN_LEFT)

        } catch (e: Exception) {
            Log.e(TAG, "Erè enprime imaj: ${e.message}", e)
            writeBytes(ALIGN_LEFT)
        }
    }

    /**
     * Konvèti yon Bitmap an fòma raster ESC/POS (GS v 0) epi voye l bay enprimant lan.
     * Sèy nwa/blan senp (threshold) — pa gen dithering pou kounye a.
     */
    private fun printBitmap(original: Bitmap) {
        // 58mm papye ≈ 384 dots nan 203dpi (estanda pou pifò enprimant tèmik 58mm)
        val targetWidth = 384
        val scale = targetWidth.toFloat() / original.width
        val targetHeight = (original.height * scale).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createScaledBitmap(original, targetWidth, targetHeight, true)

        val widthBytes = (targetWidth + 7) / 8

        // GS v 0 m xL xH yL yH d1...dk
        val header = byteArrayOf(
            GS, 0x76, 0x30, 0x00,
            (widthBytes and 0xFF).toByte(), ((widthBytes shr 8) and 0xFF).toByte(),
            (targetHeight and 0xFF).toByte(), ((targetHeight shr 8) and 0xFF).toByte()
        )
        writeBytes(header)

        val rowBytes = ByteArray(widthBytes)
        for (y in 0 until targetHeight) {
            rowBytes.fill(0)
            for (x in 0 until targetWidth) {
                val pixel = bitmap.getPixel(x, y)
                val r = (pixel shr 16) and 0xFF
                val g = (pixel shr 8) and 0xFF
                val b = pixel and 0xFF
                val gray = (r * 0.299 + g * 0.587 + b * 0.114).toInt()
                val isBlack = gray < 128
                if (isBlack) {
                    val byteIndex = x / 8
                    val bitIndex = 7 - (x % 8)
                    rowBytes[byteIndex] = (rowBytes[byteIndex].toInt() or (1 shl bitIndex)).toByte()
                }
            }
            writeBytes(rowBytes)

            // ✅ NOUVO — Ti poz chak 8 liy pou pa debòde tanpon (buffer) enprimant lan.
            // San sa, enprimant lan "kanpe" apre imaj la paske li poko fin trete tout done yo
            // lè koneksyon an fèmen twò vit.
            if (y % 8 == 0) {
                try { Thread.sleep(15) } catch (e: InterruptedException) {}
            }
        }

        // ✅ NOUVO — Bay enprimant lan tan pou l fini enprime tèt tèmik la
        // (enprime imaj pran plis tan pase tèks — pwopòsyonèl ak wotè imaj la)
        val estimatedPrintTimeMs = (targetHeight * 4L).coerceAtMost(4000L)
        try { Thread.sleep(estimatedPrintTimeMs) } catch (e: InterruptedException) {}

        if (!bitmap.isRecycled) bitmap.recycle()
    }

    private fun printQrCode(line: JSONObject) {
        val content = line.optString("content", "")
        val size = line.optInt("size", 8).coerceIn(1, 16)

        // Alignement
        when (line.optString("align", "center")) {
            "left"  -> writeBytes(ALIGN_LEFT)
            "right" -> writeBytes(ALIGN_RIGHT)
            else    -> writeBytes(ALIGN_CENTER)
        }

        // ESC/POS QR code commands
        // Set model
        writeBytes(byteArrayOf(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00))
        // Set size
        writeBytes(byteArrayOf(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size.toByte()))
        // Set error correction
        writeBytes(byteArrayOf(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31))
        // Store data
        val bytes = content.toByteArray()
        val len = bytes.size + 3
        writeBytes(byteArrayOf(GS, 0x28, 0x6B, (len and 0xFF).toByte(), ((len shr 8) and 0xFF).toByte(), 0x31, 0x50, 0x30))
        writeBytes(bytes)
        // Print
        writeBytes(byteArrayOf(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30))

        writeString("\n")
        writeBytes(ALIGN_LEFT)
    }

    private fun printBarcode(line: JSONObject) {
        val content = line.optString("content", "")
        // Alignement
        when (line.optString("align", "center")) {
            "left"  -> writeBytes(ALIGN_LEFT)
            "right" -> writeBytes(ALIGN_RIGHT)
            else    -> writeBytes(ALIGN_CENTER)
        }

        // CODE128 defo
        writeBytes(byteArrayOf(GS, 0x6B, 0x49, content.length.toByte()))
        writeBytes(content.toByteArray())
        writeString("\n")
        writeBytes(ALIGN_LEFT)
    }

    private fun printTable(line: JSONObject) {
        val bold = line.optBoolean("bold", false)
        if (bold) writeBytes(BOLD_ON)

        val columns = line.optJSONArray("columns") ?: return
        val sb = StringBuilder()
        for (i in 0 until columns.length()) {
            val col = columns.getJSONObject(i)
            val text = col.optString("text", "")
            val width = col.optInt("width", 33)
            val chars = (width * 32 / 100).coerceAtLeast(1) // 32 chars total pou 58mm
            sb.append(text.padEnd(chars).take(chars))
        }
        writeString(sb.toString() + "\n")

        if (bold) writeBytes(BOLD_OFF)
    }

    // ═══════════════════════════════════════════════════
    // WRITE HELPERS
    // ═══════════════════════════════════════════════════

    private fun writeBytes(bytes: ByteArray) {
        try {
            outputStream?.write(bytes)
            outputStream?.flush()
        } catch (e: Exception) {
            Log.e(TAG, "Erè ekri: ${e.message}")
        }
    }

    private fun writeString(text: String) {
        // ✅ KORIJE — itilize Windows-1252 olye UTF-8
        // UTF-8 voye 2 bytes pou chak karaktè aksan (è, ò, à, é) ki fè enprimant lan
        // "korompi" yo an fo-karaktè chinwa. Windows-1252 kouvri byen aksan Kreyòl/Franse
        // yo ak yon sèl byte pou chak karaktè, ki matche codepage enprimant lan (WPC1252).
        val bytes = try {
            text.toByteArray(Charset.forName("windows-1252"))
        } catch (e: Exception) {
            text.toByteArray(Charsets.ISO_8859_1)
        }
        writeBytes(bytes)
    }

    // ═══════════════════════════════════════════════════
    // PREFERENCES
    // ═══════════════════════════════════════════════════

    fun saveAddress(address: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREFS_KEY, address)
            .apply()
    }

    fun clearAddress() {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(PREFS_KEY)
            .apply()
    }

    private fun getSavedAddress(): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(PREFS_KEY, null)
    }
}
