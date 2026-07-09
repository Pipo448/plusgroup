package com.plusgroupe.printer.drivers

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.util.Base64
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.URL
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

                for (i in 0 until lines.length()) {
                    val line = lines.getJSONObject(i)
                    processLine(line)
                }
            }

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
        // TODO: Enprime imaj real — mande konvèsyon bitmap → ESC/POS raster
        // Pou kounye a, mete yon placeholder
        writeString("[IMAGE]\n")
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
        writeBytes(text.toByteArray(Charsets.UTF_8))
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
