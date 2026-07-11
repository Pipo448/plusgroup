// src/pages/settings/PrinterTestPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Bluetooth, Printer, Search, CheckCircle2, XCircle,
  Radio, Zap, FileText, Loader
} from 'lucide-react'

export default function PrinterTestPage() {
  const navigate = useNavigate()

  const [info,       setInfo]       = useState(null)
  const [devices,    setDevices]    = useState([])
  const [scanning,   setScanning]   = useState(false)
  const [connecting, setConnecting] = useState(null) // adrès aparèy k ap konekte
  const [printing,   setPrinting]   = useState(false)

  // ✅ NOUVO — Chajman DINAMIK ak SEKIRIZE plugin la. Sou kèk aparèy POS (WebView pi vye,
  // pon Capacitor ki poko fin inisyalize), yon import estatik ka lakòz plugin lan rete
  // 'null' san avètisman. Chajman dinamik + eta 'ready' anpeche kraze si sa rive.
  const printerRef = useRef(null)
  const [pluginReady, setPluginReady] = useState(false)
  const [pluginError, setPluginError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadPlugin() {
      if (!Capacitor.isNativePlatform()) {
        setPluginError('Paj sa a sèlman mache nan APK Android — pa nan navigatè web.')
        return
      }
      try {
        const mod = await import('@capacitor-plus/universal-printer')
        if (cancelled) return
        if (!mod?.UniversalPrinter) {
          setPluginError('Plugin enprimant lan pa jwenn sou aparèy sa a. Verifye APK a byen enstale.')
          return
        }
        printerRef.current = mod.UniversalPrinter
        setPluginReady(true)
      } catch (e) {
        if (!cancelled) {
          setPluginError('Erè chajman plugin: ' + (e?.message || e))
        }
      }
    }

    loadPlugin()
    return () => { cancelled = true }
  }, [])

  // ─── Chaje enfo enprimant lè plugin la prè
  useEffect(() => {
    if (pluginReady) refreshInfo()
    // eslint-disable-next-line
  }, [pluginReady])

  const refreshInfo = async () => {
    if (!printerRef.current) return
    try {
      const data = await printerRef.current.getInfo()
      setInfo(data)
    } catch (e) {
      toast.error('Erè: ' + (e.message || 'pa kapab jwenn enfo'))
    }
  }

  const scanBluetooth = async () => {
    if (!printerRef.current) return toast.error('Plugin enprimant lan poko prè.')
    setScanning(true)
    try {
      const result = await printerRef.current.scanBluetoothPrinters()
      setDevices(result.devices || [])
      if (result.devices.length === 0) {
        toast('Pa gen aparèy Bluetooth kouple. Kouple enprimant nan Settings Android premye.', { icon: '⚠️' })
      } else {
        toast.success(`${result.devices.length} aparèy jwenn`)
      }
    } catch (e) {
      toast.error('Erè scan: ' + (e.message || e))
    } finally {
      setScanning(false)
    }
  }

  const connectDevice = async (device) => {
    if (!printerRef.current) return toast.error('Plugin enprimant lan poko prè.')
    setConnecting(device.address)
    try {
      await printerRef.current.connectBluetoothPrinter({ address: device.address })
      toast.success(`Konekte ak ${device.name}!`)
      await refreshInfo() // rafrechi enfo — kounye a enprimant Bluetooth aktif
    } catch (e) {
      toast.error('Erè koneksyon: ' + (e.message || e))
    } finally {
      setConnecting(null)
    }
  }

  const disconnectPrinter = async () => {
    if (!printerRef.current) return
    try {
      await printerRef.current.disconnectBluetoothPrinter()
      toast.success('Dekonekte')
      await refreshInfo()
    } catch (e) {
      toast.error('Erè: ' + e.message)
    }
  }

  const printTest = async () => {
    if (!printerRef.current) return toast.error('Plugin enprimant lan poko prè.')
    setPrinting(true)
    try {
      const result = await printerRef.current.printTestPage()
      if (result.success) {
        toast.success('Voye nan enprimant!')
      } else {
        toast.error(result.message || 'Erè enprime')
      }
    } catch (e) {
      toast.error('Erè: ' + e.message)
    } finally {
      setPrinting(false)
    }
  }

  const printCustom = async () => {
    if (!printerRef.current) return toast.error('Plugin enprimant lan poko prè.')
    setPrinting(true)
    try {
      const result = await printerRef.current.print({
        lines: [
          { type: 'text', content: 'PLUS GROUP', align: 'center', size: 'xlarge', bold: true },
          { type: 'text', content: 'Ouanaminthe, Ayiti', align: 'center', size: 'small' },
          { type: 'divider' },
          { type: 'text', content: `Fakti: #DEV-2026-0001`, bold: true },
          { type: 'text', content: `Dat: ${new Date().toLocaleString('fr-HT')}`, size: 'small' },
          { type: 'space' },
          { type: 'text', content: 'Chaise Pliante Noire' },
          { type: 'text', content: '  24 x 4,000 HTG', size: 'small' },
          { type: 'text', content: '96,000 HTG', align: 'right' },
          { type: 'text', content: 'RABAIS: -12,000 HTG', align: 'right' },
          { type: 'divider' },
          { type: 'text', content: 'TOTAL: 84,000 HTG', bold: true, size: 'large', align: 'right' },
          { type: 'space', lines: 2 },
          { type: 'text', content: 'Mèsi pou konfyans ou!', align: 'center', bold: true },
          { type: 'space' },
          { type: 'qrcode', content: 'https://plusgroupe.com/DEV-2026-0001', align: 'center', size: 6 },
        ]
      })
      if (result.success) toast.success('Resi enprime!')
      else toast.error(result.message || 'Erè')
    } catch (e) {
      toast.error('Erè: ' + e.message)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 700, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40, height: 40, borderRadius: 10,
            border: 'none', background: '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
          <ArrowLeft size={18}/>
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#0F172A' }}>Tès Enprimant</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            Konfigire ak teste enprimant tèmik ou
          </p>
        </div>
      </div>

      {/* ✅ NOUVO — Eta chajman/erè plugin la */}
      {pluginError && (
        <div style={{
          padding: '14px 16px', marginBottom: 16,
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 12, color: '#DC2626', fontSize: 13, fontWeight: 700,
        }}>
          ⚠️ {pluginError}
        </div>
      )}
      {!pluginReady && !pluginError && (
        <div style={{
          padding: '14px 16px', marginBottom: 16,
          background: '#F1F5F9', borderRadius: 12,
          color: '#64748B', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Loader size={16} className="spin"/> Chajman plugin enprimant...
        </div>
      )}

      {/* Kat Enfo Aparèy */}
      <div style={{
        background: '#FFF',
        borderRadius: 14,
        padding: 18,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#1B2A8F15', color: '#1B2A8F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Printer size={20}/>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#0F172A' }}>Enfòmasyon Aparèy</p>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Deteksyon otomatik</p>
          </div>
        </div>

        {info ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow label="Tip enprimant" value={info.printerType.toUpperCase()} highlight/>
            <InfoRow label="Modèl aparèy" value={info.deviceModel}/>
            <InfoRow label="Lajè papye" value={`${info.paperWidth}mm`}/>
            <InfoRow
              label="Statis"
              value={info.isReady ? '✓ Prè' : '✗ Pa prè'}
              color={info.isReady ? '#059669' : '#DC2626'}
            />
            <InfoRow label="Mesaj" value={info.statusMessage} small/>

            <button
              onClick={refreshInfo}
              style={{
                marginTop: 8, padding: '10px 14px',
                background: '#F1F5F9', border: 'none',
                borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: '#334155',
              }}>
              🔄 Rafrechi
            </button>
          </div>
        ) : (
          <p style={{ color: '#64748B', fontSize: 13 }}>Chajman...</p>
        )}
      </div>

      {/* Seksyon Bluetooth */}
      <div style={{
        background: '#FFF',
        borderRadius: 14,
        padding: 18,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#0EA5E915', color: '#0EA5E9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bluetooth size={20}/>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#0F172A' }}>Enprimant Bluetooth</p>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Chwazi yon aparèy pou konekte</p>
          </div>
        </div>

        <button
          onClick={scanBluetooth}
          disabled={scanning}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
            color: '#FFF', border: 'none',
            borderRadius: 12, cursor: 'pointer',
            fontSize: 14, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 12,
            opacity: scanning ? 0.7 : 1,
          }}>
          {scanning ? <><Loader size={16} className="spin"/> Ap chèche...</> : <><Search size={16}/> Chèche Aparèy Kouple</>}
        </button>

        {devices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map(device => (
              <div key={device.address} style={{
                padding: '12px 14px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Radio size={18} color="#0EA5E9"/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    {device.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748B', margin: 0, fontFamily: 'monospace' }}>
                    {device.address}
                  </p>
                </div>
                <button
                  onClick={() => connectDevice(device)}
                  disabled={connecting === device.address}
                  style={{
                    padding: '8px 14px',
                    background: '#1B2A8F', color: '#FFF',
                    border: 'none', borderRadius: 8,
                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  }}>
                  {connecting === device.address ? '...' : 'Konekte'}
                </button>
              </div>
            ))}
          </div>
        )}

        {info?.printerType === 'bluetooth' && (
          <button
            onClick={disconnectPrinter}
            style={{
              width: '100%', marginTop: 12, padding: '10px',
              background: 'transparent', color: '#DC2626',
              border: '2px solid #DC2626', borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
            Dekonekte
          </button>
        )}
      </div>

      {/* Seksyon Tès */}
      <div style={{
        background: '#FFF',
        borderRadius: 14,
        padding: 18,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#FF6B0015', color: '#FF6B00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20}/>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#0F172A' }}>Tès Enprime</p>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Verifye ke tout mache</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={printTest}
            disabled={printing || !info?.isReady}
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, #FF6B00, #FF8C33)',
              color: '#FFF', border: 'none',
              borderRadius: 12, cursor: printing ? 'wait' : 'pointer',
              fontSize: 14, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (printing || !info?.isReady) ? 0.5 : 1,
              boxShadow: '0 4px 12px rgba(255,107,0,0.3)',
            }}>
            {printing ? <Loader size={16}/> : <Printer size={16}/>}
            {printing ? 'Ap enprime...' : 'Enprime Paj Tès Senp'}
          </button>

          <button
            onClick={printCustom}
            disabled={printing || !info?.isReady}
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, #1B2A8F, #2D3FBF)',
              color: '#FFF', border: 'none',
              borderRadius: 12, cursor: printing ? 'wait' : 'pointer',
              fontSize: 14, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (printing || !info?.isReady) ? 0.5 : 1,
              boxShadow: '0 4px 12px rgba(27,42,143,0.3)',
            }}>
            {printing ? <Loader size={16}/> : <FileText size={16}/>}
            Enprime Resi Fakti (ak QR)
          </button>
        </div>

        {!info?.isReady && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: '#FEF3C7', border: '1px solid #FBBF24',
            borderRadius: 10, fontSize: 12, color: '#92400E', fontWeight: 600,
          }}>
            ⚠️ Konfigire enprimant lan avan ou eseye enprime
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}

function InfoRow({ label, value, highlight, color, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: small ? 11 : 13, color: '#64748B', fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: small ? 11 : 13,
        fontWeight: highlight ? 900 : 700,
        color: color || (highlight ? '#1B2A8F' : '#0F172A'),
        fontFamily: highlight ? 'monospace' : 'inherit',
        textAlign: 'right',
        maxWidth: '60%',
      }}>
        {value}
      </span>
    </div>
  )
}