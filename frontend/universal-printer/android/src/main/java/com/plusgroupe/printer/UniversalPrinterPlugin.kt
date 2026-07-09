package com.plusgroupe.printer

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.JSArray
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import android.Manifest
import org.json.JSONArray

@CapacitorPlugin(
    name = "UniversalPrinter",
    permissions = [
        Permission(
            alias = "bluetooth",
            strings = [
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            ]
        )
    ]
)
class UniversalPrinterPlugin : Plugin() {

    private lateinit var printerManager: PrinterManager

    override fun load() {
        super.load()
        printerManager = PrinterManager(context)
    }

    // ═══════════════════════════════════════════════════
    // METÒD EKSPÒZE OZ JAVASCRIPT
    // ═══════════════════════════════════════════════════

    @PluginMethod
    fun getInfo(call: PluginCall) {
        val result = JSObject().apply {
            put("printerType", printerManager.getPrinterType())
            put("deviceModel", printerManager.getDeviceModel())
            put("paperWidth", printerManager.getPaperWidth())
            put("isReady", printerManager.isReady())
            put("statusMessage", printerManager.getStatusMessage())
        }
        call.resolve(result)
    }

    @PluginMethod
    fun print(call: PluginCall) {
        val linesArg = call.getArray("lines")
        if (linesArg == null) {
            call.reject("Paramèt 'lines' obligatwa")
            return
        }

        val copies = call.getInt("copies", 1) ?: 1
        val cutAtEnd = call.getBoolean("cutAtEnd", true) ?: true
        val beepAtEnd = call.getBoolean("beepAtEnd", false) ?: false

        val lines = JSONArray(linesArg.toString())

        if (cutAtEnd) {
            lines.put(JSObject().apply { put("type", "feed"); put("lines", 3) })
            lines.put(JSObject().apply { put("type", "cut") })
        }
        if (beepAtEnd) {
            lines.put(JSObject().apply { put("type", "beep") })
        }

        Thread {
            val result = printerManager.print(lines, copies)
            val response = JSObject().apply {
                put("success", result.success)
                put("printerUsed", printerManager.getPrinterType())
                result.message?.let { put("message", it) }
            }
            call.resolve(response)
        }.start()
    }

    @PluginMethod
    fun printTestPage(call: PluginCall) {
        val lines = JSONArray()
        lines.put(JSObject().apply {
            put("type", "text")
            put("content", "PAJ TÈS")
            put("align", "center")
            put("size", "xlarge")
            put("bold", true)
        })
        lines.put(JSObject().apply { put("type", "divider") })
        lines.put(JSObject().apply {
            put("type", "text")
            put("content", "Universal Printer")
            put("align", "center")
        })
        lines.put(JSObject().apply {
            put("type", "text")
            put("content", "Enprimant: ${printerManager.getPrinterType()}")
        })
        lines.put(JSObject().apply {
            put("type", "text")
            put("content", "Aparèy: ${printerManager.getDeviceModel()}")
        })
        lines.put(JSObject().apply {
            put("type", "text")
            put("content", "Papye: ${printerManager.getPaperWidth()}mm")
        })
        lines.put(JSObject().apply { put("type", "divider") })
        lines.put(JSObject().apply {
            put("type", "text")
            put("content", "Enprimant ap mache! ✓")
            put("align", "center")
        })
        lines.put(JSObject().apply { put("type", "feed"); put("lines", 3) })
        lines.put(JSObject().apply { put("type", "cut") })

        Thread {
            val result = printerManager.print(lines, 1)
            val response = JSObject().apply {
                put("success", result.success)
                put("printerUsed", printerManager.getPrinterType())
                result.message?.let { put("message", it) }
            }
            call.resolve(response)
        }.start()
    }

    // ═══════════════════════════════════════════════════
    // BLUETOOTH — ✅ KORIJE: mande pèmisyon runtime anvan
    // ═══════════════════════════════════════════════════

    @PluginMethod
    fun scanBluetoothPrinters(call: PluginCall) {
        // ✅ Verifye pèmisyon anvan — si manke, mande yo epi tann repons
        if (getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback")
            return
        }
        doScanBluetoothPrinters(call)
    }

    @PermissionCallback
    private fun bluetoothPermsCallback(call: PluginCall) {
        if (getPermissionState("bluetooth") == com.getcapacitor.PermissionState.GRANTED) {
            // Detèmine ki metòd ki te rele orijinèlman selon sa nou sove nan call la
            val methodName = call.getString("__pendingMethod")
            when (methodName) {
                "connect" -> doConnectBluetoothPrinter(call)
                else -> doScanBluetoothPrinters(call)
            }
        } else {
            call.reject("Pèmisyon Bluetooth refize. Ale nan Paramèt aparèy la pou aktive l manyèlman.")
        }
    }

    private fun doScanBluetoothPrinters(call: PluginCall) {
        try {
            val btManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val adapter: BluetoothAdapter? = btManager.adapter

            if (adapter == null) {
                call.reject("Bluetooth pa sipòte sou aparèy sa a")
                return
            }
            if (!adapter.isEnabled) {
                call.reject("Bluetooth pa aktive. Tanpri aktive Bluetooth nan Paramèt.")
                return
            }

            val devicesArray = JSArray()

            @Suppress("MissingPermission")
            val bondedDevices = adapter.bondedDevices ?: emptySet()

            for (device in bondedDevices) {
                @Suppress("MissingPermission")
                val deviceObj = JSObject().apply {
                    put("name", device.name ?: "Enkoni")
                    put("address", device.address)
                    put("bonded", true)
                }
                devicesArray.put(deviceObj)
            }

            val result = JSObject().apply {
                put("devices", devicesArray)
            }
            call.resolve(result)

        } catch (e: SecurityException) {
            call.reject("Pèmisyon Bluetooth manke: ${e.message}")
        } catch (e: Exception) {
            call.reject("Erè: ${e.message}")
        }
    }

    @PluginMethod
    fun connectBluetoothPrinter(call: PluginCall) {
        val address = call.getString("address")
        if (address.isNullOrEmpty()) {
            call.reject("Paramèt 'address' obligatwa")
            return
        }

        // ✅ Verifye pèmisyon anvan konekte tou
        if (getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
            call.data.put("__pendingMethod", "connect")
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback")
            return
        }
        doConnectBluetoothPrinter(call)
    }

    private fun doConnectBluetoothPrinter(call: PluginCall) {
        val address = call.getString("address")
        if (address.isNullOrEmpty()) {
            call.reject("Paramèt 'address' obligatwa")
            return
        }

        val btDriver = printerManager.getBluetoothDriver()
        btDriver.saveAddress(address)

        printerManager.refresh()

        val result = JSObject().apply {
            put("success", true)
        }
        call.resolve(result)
    }

    @PluginMethod
    fun disconnectBluetoothPrinter(call: PluginCall) {
        val btDriver = printerManager.getBluetoothDriver()
        btDriver.clearAddress()
        printerManager.refresh()
        call.resolve()
    }

    @PluginMethod
    fun openCashDrawer(call: PluginCall) {
        val result = JSObject().apply {
            put("success", false)
            put("message", "Kes drawer poko sipòte")
        }
        call.resolve(result)
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        printerManager.destroy()
    }
}
