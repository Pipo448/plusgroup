// src/pages/settings/PrinterTestPage.jsx — Plus Fit redesign
// ✅ KORIJE: paj la te kraze si plugin lan pa voye printerType oswa devices (undefined);
//            apèl natif yo te ka bloke bouton yo pou toutan (kounye a gen limit tan);
//            resi tès la te gen « PLUS GROUP » ekri fiks (kounye a se non antrepriz ou);
//            dat la pa t an lè Ayiti; bouton retounen pa t mache si paj la te louvri dirèkteman;
//            enprimant ki sove a pa t parèt; espas « san koupe » te bay « ? » sou papye a
// ✅ NOUVO:  estati an dirèk nan tèt paj la, rekonekte dènye enprimant lan an yon klik,
//            enprimant yo klase an premye nan lis la, tès lajè papye (règ), jounal tès yo
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Bluetooth, Printer, Search, CheckCircle2, XCircle, Radio, Zap, FileText,
  RefreshCw, Smartphone, Ruler, Link2, Unlink, History, Info, Settings,
} from 'lucide-react'
import { saveNativePrinter, forgetNativePrinter, ensureNativePrinter, withTimeout } from '../../services/printerService'
import { useAuthStore } from '../../stores/authStore'
import '../invoices/invoices.css'

const NATIVE_KEY = 'pg-native-printer'
const TZ = 'America/Port-au-Prince'
// ✅ Espas nòmal — enprimant tèmik la montre « ? » pou espas san koupe
const clean = (s) => String(s ?? '').replace(/ /g, ' ').replace(/ /g, ' ')
const fmt = (n) => clean(Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const nowHT = () => clean(new Date().toLocaleString('fr-HT', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
const timeHT = () => new Date().toLocaleTimeString('fr-HT', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' })
const errMsg = (e) => e?.message === 'TIMEOUT' ? 'Enprimant lan pa reponn (tan an fini)' : (e?.message || String(e || 'Erè'))
const readSaved = () => { try { return JSON.parse(localStorage.getItem(NATIVE_KEY) || 'null') } catch { return null } }
// Non ki sanble ak yon enprimant → mete yo an premye
const looksLikePrinter = (n = '') => /print|pos|pt-?\d|rpp|mtp|xp-|tm-|inner|sunmi|thermal|58|80|bt-?p/i.test(n)

function InfoRow({ label, value, color, mono }) {
  return (
    <div className="iv-rrow" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <span>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontWeight: 800, color: color || 'var(--ink)', textAlign: 'right', maxWidth: '62%', wordBreak: 'break-word' }}>{value ?? '—'}</span>
    </div>
  )
}

export default function PrinterTestPage() {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()

  const [info, setInfo]             = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [devices, setDevices]       = useState(null) // null = poko chèche
  const [scanning, setScanning]     = useState(false)
  const [connecting, setConnecting] = useState(null)
  const [printing, setPrinting]     = useState(null) // 'test' | 'receipt' | 'ruler'
  const [saved, setSaved]           = useState(readSaved)
  const [log, setLog]               = useState([])

  // Chajman dinamik plugin lan (kèk WebView POS pa renmen import estatik)
  const printerRef = useRef(null)
  const [pluginReady, setPluginReady] = useState(false)
  const [pluginError, setPluginError] = useState(null)
  const isNative = (() => { try { return Capacitor.isNativePlatform() } catch { return false } })()

  const addLog = (ok, msg) => setLog(l => [{ id: Date.now() + Math.random(), ok, msg, at: timeHT() }, ...l].slice(0, 8))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isNative) { setPluginError('web'); return }
      try {
        const mod = await import('@capacitor-plus/universal-printer')
        if (cancelled) return
        if (!mod?.UniversalPrinter) { setPluginError('Plugin enprimant lan pa jwenn sou aparèy sa a. Verifye APK a byen enstale.'); return }
        printerRef.current = mod.UniversalPrinter
        setPluginReady(true)
      } catch (e) {
        if (!cancelled) setPluginError('Erè chajman plugin: ' + errMsg(e))
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line
  }, [])

  const refreshInfo = useCallback(async (silent) => {
    const P = printerRef.current
    if (!P) return null
    setLoadingInfo(true)
    try {
      const data = await withTimeout(P.getInfo(), 6000)
      setInfo(data || {})
      return data
    } catch (e) {
      if (!silent) toast.error('Pa ka jwenn enfo: ' + errMsg(e))
      return null
    } finally {
      setLoadingInfo(false)
    }
  }, [])

  useEffect(() => { if (pluginReady) refreshInfo(true) }, [pluginReady, refreshInfo])

  const scanBluetooth = async () => {
    const P = printerRef.current
    if (!P) return toast.error('Plugin enprimant lan poko prè.')
    setScanning(true)
    try {
      const result = await withTimeout(P.scanBluetoothPrinters(), 15000)
      const list = Array.isArray(result?.devices) ? result.devices.filter(d => d?.address) : []
      list.sort((a, b) => looksLikePrinter(b.name) - looksLikePrinter(a.name) || (a.name || '').localeCompare(b.name || ''))
      setDevices(list)
      if (!list.length) toast('Pa gen aparèy Bluetooth kouple. Kouple enprimant lan nan Paramèt Android anvan.', { icon: '⚠️' })
      else toast.success(`${list.length} aparèy jwenn`)
    } catch (e) {
      setDevices([])
      toast.error('Erè rechèch: ' + errMsg(e))
    } finally {
      setScanning(false)
    }
  }

  const connectDevice = async (device) => {
    const P = printerRef.current
    if (!P) return toast.error('Plugin enprimant lan poko prè.')
    setConnecting(device.address)
    try {
      await withTimeout(P.connectBluetoothPrinter({ address: device.address }), 15000)
      saveNativePrinter(device)                 // lòt paj yo ap rekonekte l otomatikman
      setSaved({ address: device.address, name: device.name || '' })
      ensureNativePrinter().catch(() => {})
      toast.success(`Konekte ak ${device.name || device.address}!`)
      addLog(true, `Konekte: ${device.name || device.address}`)
      await refreshInfo(true)
    } catch (e) {
      toast.error('Erè koneksyon: ' + errMsg(e))
      addLog(false, `Koneksyon echwe: ${device.name || device.address} — ${errMsg(e)}`)
    } finally {
      setConnecting(null)
    }
  }

  const disconnectPrinter = async () => {
    const P = printerRef.current
    if (!P) return
    try {
      await withTimeout(P.disconnectBluetoothPrinter(), 8000)
    } catch (e) {
      toast.error('Erè: ' + errMsg(e))
    } finally {
      // Se itilizatè a ki dekonekte l — pa rekonekte otomatikman
      forgetNativePrinter()
      setSaved(null)
      ensureNativePrinter().catch(() => {})
      addLog(true, 'Dekonekte')
      toast.success('Dekonekte')
      refreshInfo(true)
    }
  }

  const run = async (kind, fn, okMsg) => {
    if (!printerRef.current) return toast.error('Plugin enprimant lan poko prè.')
    setPrinting(kind)
    try {
      const result = await withTimeout(fn(printerRef.current), 20000)
      if (result?.success === false) throw new Error(result.message || 'Erè enprime')
      toast.success(okMsg)
      addLog(true, okMsg)
    } catch (e) {
      toast.error(errMsg(e))
      addLog(false, errMsg(e))
      refreshInfo(true)
    } finally {
      setPrinting(null)
    }
  }

  const printTest = () => run('test', P => P.printTestPage(), 'Paj tès voye nan enprimant lan')

  const printReceipt = () => run('receipt', P => {
    const name = clean(tenant?.name || 'Antrepriz mwen')
    const lines = [
      { type: 'text', content: name.toUpperCase(), align: 'center', size: 'xlarge', bold: true },
    ]
    if (tenant?.address) lines.push({ type: 'text', content: clean(tenant.address), align: 'center', size: 'small' })
    if (tenant?.phone) lines.push({ type: 'text', content: `Tel: ${clean(tenant.phone)}`, align: 'center', size: 'small' })
    lines.push(
      { type: 'divider' },
      { type: 'text', content: 'RESI TES — PA VALAB', bold: true, align: 'center' },
      { type: 'text', content: `Dat: ${nowHT()}`, size: 'small' },
      { type: 'space' },
      { type: 'text', content: 'Diri Tchako 25lb' },
      { type: 'text', content: `  2 x ${fmt(2250)}`, size: 'small' },
      { type: 'text', content: `${fmt(4500)} HTG`, align: 'right' },
      { type: 'text', content: 'Lwil Mazola 1L' },
      { type: 'text', content: `  3 x ${fmt(450)}`, size: 'small' },
      { type: 'text', content: `${fmt(1350)} HTG`, align: 'right' },
      { type: 'divider' },
      { type: 'text', content: `TOTAL: ${fmt(5850)} HTG`, bold: true, size: 'large', align: 'right' },
      { type: 'text', content: 'Accents: é è ò à — Kreyòl', size: 'small' },
      { type: 'space' },
    )
    if (tenant?.receiptFooterNote) lines.push({ type: 'text', content: clean(tenant.receiptFooterNote), align: 'center', size: 'small' })
    lines.push({ type: 'text', content: 'Mesi pou konfyans ou!', align: 'center', bold: true })
    if (tenant?.showQrCode !== false) lines.push({ type: 'space' }, { type: 'qrcode', content: 'https://app.plusgroupe.com', align: 'center', size: 6 })
    lines.push({ type: 'space', lines: 3 })
    return P.print({ lines })
  }, 'Resi tès enprime')

  // Règ pou wè konbyen karaktè papye a pran (32 = 58mm, 48 = 80mm)
  const printRuler = () => run('ruler', P => P.print({
    lines: [
      { type: 'text', content: 'TES LAJE PAPYE', align: 'center', bold: true },
      { type: 'text', content: '1234567890'.repeat(5).slice(0, 48) },
      { type: 'text', content: '|---------- 32 ----------------|' },
      { type: 'text', content: '|---------------------- 48 ---------------------|' },
      { type: 'text', content: '58mm = 32 karakte · 80mm = 48 karakte', size: 'small', align: 'center' },
      { type: 'divider' },
      { type: 'text', content: `Lajè detekte: ${info?.paperWidth || '?'}mm`, align: 'center', size: 'small' },
      { type: 'space', lines: 3 },
    ],
  }), 'Règ lajè papye enprime')

  const ready = !!info?.isReady
  const ptype = String(info?.printerType || '').toUpperCase() || '—'
  const isBT = String(info?.printerType || '').toLowerCase() === 'bluetooth'
  const statusColor = !isNative ? '#94A3B8' : ready ? '#34D399' : pluginReady ? '#F87171' : '#FBBF24'
  const statusText = !isNative ? 'Navigatè web' : ready ? 'Prè pou enprime' : pluginReady ? 'Pa prè' : pluginError ? 'Erè plugin' : 'Ap chaje…'
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/app/settings'))

  return (
    <div className="iv" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: `radial-gradient(circle, ${statusColor}66, transparent 65%)` }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button className="back" onClick={goBack} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico"><Printer size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Enprimant'}</p>
            <h1>Tès enprimant</h1>
            <p className="sub">Konekte, verifye epi teste enprimant tèmik ou.</p>
          </div>
          <span className="stamp hx" style={{ '--sc': statusColor }}><i/> {statusText}</span>
        </div>
        {pluginReady && (
          <div className="iv-kpis">
            <div className="iv-kpi" style={{ animationDelay: '80ms' }}><div className="l"><Printer size={12}/> Tip</div><div className="v">{ptype}</div></div>
            <div className="iv-kpi gold" style={{ animationDelay: '160ms' }}><div className="l"><Ruler size={12}/> Papye</div><div className="v">{info?.paperWidth ? <>{info.paperWidth}<small>mm</small></> : '—'}</div></div>
            <div className={`iv-kpi ${ready ? 'green' : 'red'}`} style={{ animationDelay: '240ms' }}><div className="l">{ready ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} Estati</div><div className="v">{ready ? 'Prè' : 'Non'}</div></div>
          </div>
        )}
      </section>

      {/* ── Eta plugin la ── */}
      {pluginError === 'web' ? (
        <div className="iv-empty" style={{ background: '#fff', borderRadius: 22, border: '1px solid var(--line)' }}>
          <div className="art"><div className="paper"><i/><i/><i/><i/></div><div className="bubble"><Smartphone size={18}/></div></div>
          <h3>Sèlman sou APK Android</h3>
          <p>Paj tès sa a sèvi ak enprimant entegre/Bluetooth aparèy Android la. Sou navigatè web, enprime fèt dirèkteman depi fakti a (USB oswa Bluetooth web).</p>
          <button className="iv-act" onClick={() => navigate('/app/settings')}><Settings size={14}/> Paramèt enprimant</button>
        </div>
      ) : pluginError ? (
        <div className="iv-banner off"><span className="ic"><XCircle size={16} color="#DC2626"/></span><span className="grow">{pluginError}</span></div>
      ) : !pluginReady ? (
        <div className="iv-banner cache"><span className="spin" style={{ width: 14, height: 14, border: '2px solid var(--muted)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}/> Chajman plugin enprimant…</div>
      ) : null}

      {pluginReady && (
        <div className="set-grid">
          <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            {/* ── Bluetooth ── */}
            <section className="iv-sec a-up">
              <div className="iv-sec-h">
                <div className="n" style={{ background: 'linear-gradient(135deg,#0EA5E9,#0284C7)' }}><Bluetooth size={17}/></div>
                <div><p className="eb">Koneksyon</p><h3>Enprimant Bluetooth</h3></div>
              </div>

              {saved?.address && (
                <div className={`set-row ${isBT && ready ? 'on' : ''}`} style={{ '--rc': '#0284C7', cursor: 'default', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                    <span className="ic"><Link2 size={17}/></span>
                    <div style={{ minWidth: 0 }}>
                      <b>{saved.name || 'Enprimant sove'}</b>
                      <small className="mono">{saved.address} · {isBT && ready ? 'konekte' : 'pa konekte'}</small>
                    </div>
                  </div>
                  {isBT && ready
                    ? <button className="iv-act danger" onClick={disconnectPrinter}><Unlink size={14}/> Dekonekte</button>
                    : <button className="iv-act sky" disabled={!!connecting} onClick={() => connectDevice(saved)}>{connecting === saved.address ? <RefreshCw size={14} className="spin"/> : <Link2 size={14}/>} Rekonekte</button>}
                </div>
              )}

              <button className="iv-btn-main" style={{ width: '100%', background: 'linear-gradient(135deg,#0EA5E9,#0284C7)', boxShadow: '0 10px 22px rgba(14,165,233,.35)' }} disabled={scanning} onClick={scanBluetooth}>
                {scanning ? <><RefreshCw size={16} className="spin"/> Ap chèche…</> : <><Search size={16}/> Chèche aparèy kouple</>}
              </button>

              {devices && devices.length > 0 && (
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                  {devices.map((d, i) => {
                    const isCur = saved?.address === d.address && isBT && ready
                    const likely = looksLikePrinter(d.name)
                    return (
                      <div key={d.address} className="set-row a-up" style={{ '--rc': '#059669', animationDelay: `${i * 40}ms`, cursor: 'default', margin: 0, ...(isCur ? { background: 'var(--okBg)', borderColor: 'rgba(5,150,105,.3)' } : {}) }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                          <span className="ic" style={likely ? { color: '#0284C7' } : undefined}>{likely ? <Printer size={17}/> : <Radio size={17}/>}</span>
                          <div style={{ minWidth: 0 }}>
                            <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || 'Aparèy san non'}</b>
                            <small className="mono">{d.address}{likely ? ' · sanble yon enprimant' : ''}</small>
                          </div>
                        </div>
                        {isCur
                          ? <span className="iv-badge" style={{ background: 'var(--okBg)', color: 'var(--ok)' }}><CheckCircle2 size={12}/> Konekte</span>
                          : <button className="iv-act" disabled={!!connecting} onClick={() => connectDevice(d)}>{connecting === d.address ? <RefreshCw size={14} className="spin"/> : 'Konekte'}</button>}
                      </div>
                    )
                  })}
                </div>
              )}

              {devices && devices.length === 0 && (
                <div className="iv-banner pend" style={{ marginTop: 12, marginBottom: 0 }}>
                  <span className="ic"><Info size={16}/></span>
                  <span className="grow">Pa gen aparèy kouple. Ale nan <b>Paramèt Android → Bluetooth</b>, limen enprimant lan, kouple l (kòd la souvan <b>0000</b> oswa <b>1234</b>), epi tounen chèche ankò.</span>
                </div>
              )}
            </section>

            {/* ── Tès ── */}
            <section className="iv-sec a-up" style={{ animationDelay: '80ms' }}>
              <div className="iv-sec-h">
                <div className="n" style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C33)' }}><Zap size={17}/></div>
                <div><p className="eb">Verifye</p><h3>Tès enprime</h3></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {[
                  { k: 'test', fn: printTest, icon: Printer, t: 'Paj tès senp', d: 'Tès rapid plugin lan', c: '#FF6B00' },
                  { k: 'receipt', fn: printReceipt, icon: FileText, t: 'Resi egzanp', d: 'Non antrepriz ou, aksan, QR', c: '#1B2A8F' },
                  { k: 'ruler', fn: printRuler, icon: Ruler, t: 'Lajè papye', d: 'Wè si tèks la koupe', c: '#0F766E' },
                ].map(b => {
                  const I = b.icon
                  return (
                    <button key={b.k} type="button" className="set-pr" style={{ '--pc': b.c, margin: 0, opacity: !ready ? .5 : 1 }} disabled={!ready || !!printing} onClick={b.fn}>
                      <span className="ic" style={{ background: b.c, color: '#fff', width: 42, height: 42 }}>{printing === b.k ? <RefreshCw size={18} className="spin"/> : <I size={18}/>}</span>
                      <span style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 13.5 }}>{printing === b.k ? 'Ap enprime…' : b.t}</b><small style={{ fontSize: 11, color: 'var(--muted)' }}>{b.d}</small></span>
                    </button>
                  )
                })}
              </div>
              {!ready && <p className="iv-note" style={{ background: 'var(--warnBg)', color: '#92400E', fontWeight: 700 }}>⚠️ Konekte enprimant lan anvan ou eseye enprime.</p>}
            </section>
          </div>

          <aside style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
            <section className="iv-sec a-up" style={{ animationDelay: '60ms' }}>
              <div className="iv-sec-h">
                <div className="n"><Smartphone size={17}/></div>
                <div><p className="eb">Deteksyon otomatik</p><h3>Aparèy</h3></div>
                <div className="r"><button className="iv-mini" onClick={() => refreshInfo(false)} disabled={loadingInfo} aria-label="Rafrechi"><RefreshCw size={14} className={loadingInfo ? 'spin' : ''}/></button></div>
              </div>
              {info ? (
                <div>
                  <InfoRow label="Tip enprimant" value={ptype} color="var(--blue)" mono/>
                  <InfoRow label="Modèl aparèy" value={info.deviceModel}/>
                  <InfoRow label="Lajè papye" value={info.paperWidth ? `${info.paperWidth} mm` : null}/>
                  <InfoRow label="Estati" value={ready ? '✓ Prè' : '✗ Pa prè'} color={ready ? 'var(--ok)' : 'var(--bad)'}/>
                  {info.statusMessage && <p className="iv-note" style={{ marginTop: 10 }}>{info.statusMessage}</p>}
                </div>
              ) : (
                [70, 50, 60, 40].map((w, i) => <div key={i} className="iv-sk" style={{ width: `${w}%`, marginBottom: 12 }}/>)
              )}
            </section>

            <section className="iv-sec a-up" style={{ animationDelay: '120ms' }}>
              <div className="iv-sec-h">
                <div className="n" style={{ background: 'linear-gradient(135deg,#475569,#1E293B)' }}><History size={17}/></div>
                <div><p className="eb">Sesyon sa a</p><h3>Jounal</h3></div>
              </div>
              {log.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {log.map(l => (
                    <div key={l.id} className="a-slide" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12 }}>
                      {l.ok ? <CheckCircle2 size={15} color="var(--ok)" style={{ flexShrink: 0, marginTop: 1 }}/> : <XCircle size={15} color="var(--bad)" style={{ flexShrink: 0, marginTop: 1 }}/>}
                      <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{l.msg}</span>
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>{l.at}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Rezilta tès ou yo ap parèt isit la.</p>}
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}